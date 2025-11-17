import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();
puppeteer.use(StealthPlugin());

// ------------------------------------------------------------
// CONFIG
// ------------------------------------------------------------
const ITEM_URL = process.env.ITEM_URL;
const MAX_BID = Number(process.env.MAX_BID || 650);
const TEST_MODE = process.env.TEST_MODE === "true";
const COOKIE_PATH = "./cookies.json";

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------
function sleep(ms) {
	return new Promise((res) => setTimeout(res, ms));
}

async function clickIfExists(page, selector) {
	const el = await page.$(selector);
	if (el) {
		await el.click();
		await sleep(350);
		return true;
	}
	return false;
}

async function saveCookies(page) {
	const cookies = await page.cookies();
	fs.writeFileSync(COOKIE_PATH, JSON.stringify(cookies, null, 2));
}

async function loadCookies(page) {
	if (!fs.existsSync(COOKIE_PATH)) return;
	const cookies = JSON.parse(fs.readFileSync(COOKIE_PATH, "utf8"));
	for (const c of cookies) {
		try {
			await page.setCookie(c);
		} catch {}
	}
}

// ------------------------------------------------------------
// LOGIN DETECTION
// ------------------------------------------------------------
async function isLoggedIn(page) {
	return await page.evaluate(() => {
		const el = document.querySelector(".gh-identity__greeting");
		if (!el) return false;
		return el.innerText.trim().startsWith("Hi");
	});
}

// ------------------------------------------------------------
// LOGIN FLOW
// ------------------------------------------------------------
async function loginEbay(page) {
	console.log("Navigating to login…");

	await page.goto("https://signin.ebay.com/", { waitUntil: "networkidle2" });

	// If the OAuth splash appears:
	const ebayBtn = await page.$('button[aria-label="Continue with eBay"]');
	if (ebayBtn) {
		console.log("Selecting 'Continue with eBay'…");
		await ebayBtn.click();
		await page.waitForSelector("#userid", { visible: true });
	}

	// USERNAME
	await page.type("#userid", process.env.EBAY_USERNAME, { delay: 50 });
	await page.click("#signin-continue-btn");

	// PASSWORD
	await page.waitForSelector("#pass", { visible: true });
	await page.type("#pass", process.env.EBAY_PASSWORD, { delay: 50 });
	await page.click("#sgnBt");

	await page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {});

	// --------------------------------------------------------
	// PASSKEY INTERSTITIAL
	// --------------------------------------------------------
	console.log("Checking for eBay passkey interstitial…");

	const passkeyModal = await page.$(
		".passkeys-register-wrapper, [data-testid='passkey-promo']"
	);
	if (passkeyModal) {
		console.log("Passkey modal detected — dismissing…");

		await clickIfExists(page, 'button[aria-label="Not now"]');
		await clickIfExists(page, 'button[data-testid="cancel"]');
		await clickIfExists(page, 'button[data-testid="skip"]');
		await clickIfExists(page, 'a[href*="skip"], a[href*="decline"]');

		// shadow dom idiot fix fallbak
		await page
			.evaluate(() => {
				const el = document.querySelector("passkeys-promo");
				if (el && el.shadowRoot) {
					const btn = el.shadowRoot.querySelector("button");
					if (btn) btn.click();
				}
			})
			.catch(() => {});
	}

	// force reload cuz ebay dumb
	await page.goto("https://www.ebay.com/", { waitUntil: "networkidle2" });

	if (await isLoggedIn(page)) {
		console.log("Login verified via navbar identity.");
	} else {
		console.log(
			"⚠️ Login may not have fully completed — continuing anyway."
		);
	}

	await saveCookies(page);
}

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------
async function measureRTT(page) {
	console.log("Measuring RTT…");
	const start = Date.now();
	await page.goto("https://www.ebay.com/", { waitUntil: "domcontentloaded" });
	const rtt = Date.now() - start;
	console.log("RTT =", rtt, "ms");
	return rtt;
}

async function performBid(page, bidAmount) {
	if (TEST_MODE) {
		console.log(`[TEST MODE] Would bid $${bidAmount}`);
		return true;
	}

	console.log("Opening bid popup…");
	await page.click("#bidBtn_btn");
	await page.waitForSelector(".place-bid-wrapper-ocv", { visible: true });

	// power bid ez
	const btns = await page.$$(".place-bid-actions__powerbids-wrapper button");
	for (const btn of btns) {
		const txt = await page.evaluate((el) => el.innerText, btn);
		if (txt.includes(`$${bidAmount}`)) {
			console.log("Clicking power-bid:", txt);
			await btn.click();
			return true;
		}
	}

	// manual
	const input = await page.$('input[id*="price"]');
	if (!input) throw new Error("Bid textbox not found.");

	await input.type(String(bidAmount), { delay: 50 });

	const incBtn = await page.$("button.btn--primary:not([disabled])");
	if (!incBtn) throw new Error("Increase bid button disabled.");
	console.log("Submitting manual bid:", bidAmount);
	await incBtn.click();

	return true;
}

// ------------------------------------------------------------
// MAIN
// ------------------------------------------------------------
async function snipe() {
	const browser = await puppeteer.launch({
		headless: false,
		defaultViewport: null,
		args: ["--no-sandbox"],
	});

	const page = await browser.newPage();
	await loadCookies(page);

	// homepage check login
	await page.goto("https://www.ebay.com/", { waitUntil: "networkidle2" });
	let loggedIn = await isLoggedIn(page);

	if (!loggedIn) {
		console.log("Not logged in — performing credential login…");
		await loginEbay(page);

		await page.goto("https://www.ebay.com/", { waitUntil: "networkidle2" });
		loggedIn = await isLoggedIn(page);

		if (!loggedIn) {
			console.log("⚠️ Login still not detected — stopping.");
			return;
		}
	}

	console.log("User is logged in — navigating to product page…");
	await page.goto(ITEM_URL, { waitUntil: "networkidle2" });

	// latency compensation
	const rtt = await measureRTT(page);
	const fireOffset = 1200 + rtt;
	console.log("Using fire offset:", fireOffset);

	// -------------------------------------------------------
	// POLLING
	// -------------------------------------------------------
	while (true) {
		// reload product pg
		await page.goto(ITEM_URL, { waitUntil: "domcontentloaded" });

		if (!page.url().includes("itm")) {
			console.log("⚠️ Redirected away from item page — retrying...");
			await sleep(5000);
			continue;
		}

		// extract bid
		const priceNode = await page.$('[data-testid="x-price-primary"] span');
		const priceText = priceNode
			? await page.evaluate((el) => el.innerText, priceNode)
			: "";
		const currentBid = Number(priceText.replace(/[^0-9.]/g, ""));
		const nextBid = currentBid + 10;

		console.log(
			`Detected current bid: $${currentBid} | Next bid would be: $${nextBid}`
		);

		if (nextBid > MAX_BID) {
			console.log("Max bid exceeded — stopping watcher.");
			break;
		}

		const timeElem = await page.$(".ux-timer__text");
		const t = timeElem
			? await page.evaluate((el) => el.innerText, timeElem)
			: "";
		const match = /(\d+)s/.exec(t);

		if (!match) {
			console.log("Unable to read seconds left — waiting 30s...");
			await sleep(30000);
			continue;
		}

		const secondsLeft = Number(match[1]);

		console.log(`Time left: ${secondsLeft}s`);

		// refresh rate based on time so ebay doesn't flag
		if (secondsLeft > 300) {
			// > 5 minutes
			console.log("Watching… next check in 60s.");
			await sleep(60000);
			continue;
		}
		if (secondsLeft > 60) {
			// 1–5 minutes
			console.log("Watching… next check in 20s.");
			await sleep(20000);
			continue;
		}
		if (secondsLeft > 15) {
			// 15–60 seconds
			console.log("Watching… next check in 5s.");
			await sleep(5000);
			continue;
		}
		if (secondsLeft > 10) {
			// 10–15 seconds
			console.log("Approaching snipe window… next check in 2s.");
			await sleep(2000);
			continue;
		}

		console.log(
			"Entering sniping window. Will execute bid within timing offset."
		);

		const waitMs = secondsLeft * 1000 - fireOffset;
		if (waitMs > 0) await sleep(waitMs);

		console.log(`Attempting snipe bid: $${nextBid}`);

		// Parallel race-style bid submission
		await Promise.race([
			performBid(page, nextBid),
			(async () => {
				await sleep(250);
				await performBid(page, nextBid);
			})(),
		]);

		console.log("Bid fired. Exiting.");
		break;
	}

	console.log("Done.");
}

snipe().catch((err) => console.error(err));