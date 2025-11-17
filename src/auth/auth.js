import { saveCookies } from "../utils/cookies.js";
import { clickIfExists } from "../utils/page.js";

/**
 * Checks if the user appears logged in by inspecting the navbar greeting.
 * Reuses your original detection logic.
 * @param {import("puppeteer").Page} page
 * @returns {Promise<boolean>}
 */
export async function isLoggedIn(page) {
	return page.evaluate(() => {
		const el = document.querySelector(".gh-identity__greeting");
		if (!el) return false;
		return el.innerText.trim().startsWith("Hi");
	});
}

/**
 * Runs the eBay login flow.
 * This is your existing verified logic with light structural cleanup.
 *
 * @param {import("puppeteer").Page} page
 * @param {string} username
 * @param {string} password
 * @param {string} cookiesPath
 * @param {ReturnType<typeof import("../logger.js").createLogger>} logger
 */
export async function loginEbay(page, username, password, cookiesPath, logger) {
	logger.info("auth", "Navigating to login…");

	await page.goto("https://signin.ebay.com/", { waitUntil: "networkidle2" });

	// OAuth splash
	const ebayBtn = await page.$('button[aria-label="Continue with eBay"]');
	if (ebayBtn) {
		logger.info("auth", "Selecting 'Continue with eBay'…");
		await ebayBtn.click();
		await page.waitForSelector("#userid", { visible: true });
	}

	// USERNAME
	await page.type("#userid", username, { delay: 50 });
	await page.click("#signin-continue-btn");

	// PASSWORD
	await page.waitForSelector("#pass", { visible: true });
	await page.type("#pass", password, { delay: 50 });
	await page.click("#sgnBt");

	await page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {});

	// Passkey interstitial
	logger.info("auth", "Checking for eBay passkey interstitial…");

	const passkeyModal = await page.$(
		".passkeys-register-wrapper, [data-testid='passkey-promo']"
	);
	if (passkeyModal) {
		logger.info("auth", "Passkey modal detected — dismissing…");

		await clickIfExists(page, 'button[aria-label="Not now"]');
		await clickIfExists(page, 'button[data-testid="cancel"]');
		await clickIfExists(page, 'button[data-testid="skip"]');
		await clickIfExists(page, 'a[href*="skip"], a[href*="decline"]');

		// Shadow DOM fallback
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

	// Force reload home so navbar state settles
	await page.goto("https://www.ebay.com/", { waitUntil: "networkidle2" });

	if (await isLoggedIn(page)) {
		logger.info("auth", "Login verified via navbar identity.");
	} else {
		logger.warn(
			"auth",
			"Login may not have fully completed — continuing anyway."
		);
	}

	await saveCookies(page, cookiesPath);
}
