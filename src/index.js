import dotenv from "dotenv";
import { loadConfig } from "./config/config.js";
import { createLogger } from "./logger.js";
import { launchBrowser } from "./browser/browserManager.js";
import { createStealthPage } from "./stealth/stealthPageFactory.js";
import { prewarmSession } from "./stealth/prewarmSession.js";
import { isLoggedIn, loginEbay } from "./auth/auth.js";
import { loadCookies, saveCookies } from "./utils/cookies.js";
import { prepareWorkerPage, scheduleWorkerFire } from "./bidding/bidWorker.js";
import { BidManager } from "./bidding/bidManager.js";
import { monitorAuctionAndPlan } from "./bidding/monitor.js";
import { measureRttToEbay } from "./timing/latency.js";

dotenv.config();

async function main() {
	const config = loadConfig();
	const logger = createLogger(config.logging.level);

	logger.info("main", "Starting multi-context sniper…");

	const browser = await launchBrowser(config.browser, logger);

	// -------------------------------
	// CREATE MONITOR PAGE (fresh)
	// -------------------------------
	const { page: monitorPage } = await createStealthPage(browser, logger);

	// -------------------------------
	// FIRST-RUN SAFE COOKIE HANDLING
	// -------------------------------
	if (config.cookiesPath) {
		await loadCookies(monitorPage, config.cookiesPath);
	}

	// -------------------------------
	// CHECK LOGIN STATUS
	// -------------------------------
	await monitorPage.goto("https://www.ebay.com/", {
		waitUntil: "networkidle2",
	});

	let loggedIn = await isLoggedIn(monitorPage);

	if (!loggedIn) {
		logger.info("main", "User not logged in — executing safe prewarm…");

		// PREWARM using monitor page BEFORE login
		await prewarmSession(monitorPage, logger);

		// CREATE DEDICATED LOGIN PAGE (clean)
		const { page: loginPage } = await createStealthPage(browser, logger);

		// Remove ANY leftover cookies from login page
		const existing = await loginPage.cookies();
		if (existing.length > 0) await loginPage.deleteCookie(...existing);

		// LOGIN FLOW
		await loginEbay(
			loginPage,
			config.ebayUsername,
			config.ebayPassword,
			config.cookiesPath,
			logger
		);

		logger.info(
			"main",
			"Login completed. Applying cookies to monitor page."
		);
		await loadCookies(monitorPage, config.cookiesPath);

		// Recheck login
		await monitorPage.goto("https://www.ebay.com/", {
			waitUntil: "networkidle2",
		});
		loggedIn = await isLoggedIn(monitorPage);

		if (!loggedIn) {
			logger.error("main", "Login failed. Exiting.");
			return;
		}
	}

	logger.info("main", "User logged in successfully.");

	// -------------------------------
	// PREPARE WORKER PAGES (with cookies)
	// -------------------------------
	const { page: workerPage1 } = await createStealthPage(browser, logger);
	const { page: workerPage2 } = await createStealthPage(browser, logger);

	await loadCookies(workerPage1, config.cookiesPath);
	await loadCookies(workerPage2, config.cookiesPath);

	await prepareWorkerPage(workerPage1, "worker-1", config.itemUrl, logger);
	await prepareWorkerPage(workerPage2, "worker-2", config.itemUrl, logger);

	// -------------------------------
	// RTT MEASUREMENT
	// -------------------------------
	const rttMs = await measureRttToEbay(
		monitorPage,
		config.timing.rttSampleCount,
		logger
	);

	// -------------------------------
	// MONITOR AUCTION → FIRE PLAN
	// -------------------------------
	const plan = await monitorAuctionAndPlan({
		page: monitorPage,
		itemUrl: config.itemUrl,
		maxBid: config.maxBid,
		timingConfig: config.timing,
		rttMs,
		logger,
	});

	if (!plan) {
		logger.warn("main", "No fire plan produced — exiting.");
		return;
	}

	const { nextBid, firePlan } = plan;

	logger.info("main", "Final fire plan ready", {
		nextBid,
		firePlan,
	});

	const bidManager = new BidManager(config.maxBid, logger);

	const workerMap = {
		"worker-1": workerPage1,
		"worker-2": workerPage2,
	};

	// -------------------------------
	// PARALLEL RACE EXECUTION
	// -------------------------------
	const firePromises = firePlan.map(({ workerId, fireInMs }) =>
		scheduleWorkerFire({
			workerId,
			page: workerMap[workerId],
			bidAmount: nextBid,
			fireInMs,
			bidManager,
			testMode: config.testMode,
			logger,
		})
	);

	await Promise.all(firePromises);

	logger.info("main", "Snipe attempt complete.");
}

main().catch((err) => console.error(err));