import { sleep } from "../utils/sleep.js";
import { performBid } from "./performBid.js";

/**
 * Prepares a worker page by loading the item once and ensuring
 * the bid button is visible. No periodic reloads are performed here.
 *
 * @param {import("puppeteer").Page} page
 * @param {string} workerId
 * @param {string} itemUrl
 * @param {ReturnType<typeof import("../logger.js").createLogger>} logger
 */
export async function prepareWorkerPage(page, workerId, itemUrl, logger) {
	logger.info("worker", "Preparing worker page…", { workerId });

	await page.goto(itemUrl, { waitUntil: "networkidle2" });

	if (!page.url().includes("itm")) {
		logger.warn("worker", "Worker page not on item URL after navigation", {
			workerId,
			url: page.url(),
		});
	}

	// Ensure bid button is present; this primes the page and CSRF tokens.
	await page.waitForSelector("#bidBtn_btn", { visible: true });

	logger.info("worker", "Worker page ready", { workerId });
}

/**
 * Schedules a worker to attempt a bid after a delay.
 * It requests permission from the BidManager before calling performBid.
 *
 * @param {object} opts
 * @param {string} opts.workerId
 * @param {import("puppeteer").Page} opts.page
 * @param {number} opts.bidAmount
 * @param {number} opts.fireInMs
 * @param {BidManager} opts.bidManager
 * @param {boolean} opts.testMode
 * @param {ReturnType<typeof import("../logger.js").createLogger>} opts.logger
 * @returns {Promise<void>}
 */
export async function scheduleWorkerFire({
	workerId,
	page,
	bidAmount,
	fireInMs,
	bidManager,
	testMode,
	logger,
}) {
	logger.info("worker", "Scheduling worker fire", {
		workerId,
		bidAmount,
		fireInMs,
	});

	if (fireInMs > 0) {
		await sleep(fireInMs);
	}

	logger.info("worker", "Worker fire window reached", {
		workerId,
		bidAmount,
	});

	const allowed = bidManager.requestFire(workerId, bidAmount);
	if (!allowed) {
		logger.info("worker", "Worker aborted — not authorized to fire", {
			workerId,
			bidAmount,
		});
		return;
	}

	try {
		await performBid(page, bidAmount, testMode, logger);
		logger.info("worker", "Bid attempt complete", { workerId, bidAmount });
	} catch (err) {
		logger.error("worker", "Bid attempt failed", {
			workerId,
			bidAmount,
			error: err?.message || String(err),
		});
	}
}
