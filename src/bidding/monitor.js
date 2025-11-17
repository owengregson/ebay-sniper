import { sleep } from "../utils/sleep.js";
import { getBidIncrement } from "./increments.js";

/**
 * Soft refresh without triggering a new navigation request.
 * eBay treats this more like a human pressing CMD+R.
 */
async function softRefresh(page, logger) {
	logger.info("monitor", "Performing soft refresh…");
	try {
		await page.evaluate(() => location.reload());
		await page.waitForNavigation({
			waitUntil: "domcontentloaded",
			timeout: 6000,
		});
	} catch {
		logger.warn("monitor", "Soft refresh navigation timeout.");
	}
}

/**
 * Hard refresh only when absolutely necessary.
 */
async function hardRefresh(page, itemUrl, logger) {
	logger.warn("monitor", "Performing HARD refresh (fallback)...");
	await page.goto(itemUrl, { waitUntil: "domcontentloaded" });
}

/**
 * Parse "3m 21s" or "21s" into seconds left.
 */
function parseTimeRemainingSeconds(str) {
	if (!str) return null;
	const m = /(?:(\d+)\s*m)?\s*(\d+)\s*s/.exec(str);
	if (!m) return null;
	const minutes = m[1] ? Number(m[1]) : 0;
	const seconds = Number(m[2]);
	return minutes * 60 + seconds;
}

/**
 * Read current timer + current bid from the page.
 */
async function readAuctionState(page) {
	return page.evaluate(() => {
		const timerEl = document.querySelector(".ux-timer__text");
		const priceEl = document.querySelector(
			'[data-testid="x-price-primary"] span'
		);

		const timerText = timerEl ? timerEl.innerText : "";
		const priceText = priceEl ? priceEl.innerText : "";

		const currentBid = priceText
			? Number(priceText.replace(/[^0-9.]/g, ""))
			: null;

		return { timerText, currentBid };
	});
}

/**
 * Dynamically choose polling speed based on time-left.
 */
function nextPollDelayMs(secondsLeft, intervals) {
	if (secondsLeft == null) return 30000;
	if (secondsLeft > 300) return intervals.gt300s;
	if (secondsLeft > 60) return intervals.gt60s;
	if (secondsLeft > 15) return intervals.gt15s;
	if (secondsLeft > 10) return intervals.gt10s;
	return intervals.lte10s;
}

/**
 * **NEW LOGIC**
 * - hybrid soft-refresh window
 * - accurate last-seconds bid reading
 * - two-phase reload safety
 * - memory-based delta detection
 */
export async function monitorAuctionAndPlan({
	page,
	itemUrl,
	maxBid,
	timingConfig,
	rttMs,
	logger,
}) {
	const {
		snipeOffsetsMs,
		snipeWindowStartSeconds,
		monitorPollIntervals,
		maxSafeReloadIntervalMs,
		rttSafetyBufferMs,
	} = timingConfig;

	const effectiveLatencyMs = rttMs + rttSafetyBufferMs;

	logger.info("monitor", "Loading item page…", { itemUrl });
	await page.goto(itemUrl, { waitUntil: "networkidle2" });

	let { timerText, currentBid } = await readAuctionState(page);
	let secondsLeft = parseTimeRemainingSeconds(timerText);

	let lastPrice = currentBid;
	let lastUpdateTs = Date.now();
	let softRefreshCount = 0;
	let hardRefreshCount = 0;

	logger.info("monitor", "Monitoring started", {
		firstSecondsLeft: secondsLeft,
		firstBid: currentBid,
	});

	while (true) {
		({ timerText, currentBid } = await readAuctionState(page));
		secondsLeft = parseTimeRemainingSeconds(timerText);

		logger.info("monitor", "Auction state", {
			timerText,
			secondsLeft,
			currentBid,
		});

		if (secondsLeft === null) {
			// Timer missing: safe reload after long cooldown
			const now = Date.now();
			if (now - lastUpdateTs > maxSafeReloadIntervalMs) {
				await softRefresh(page, logger);
				lastUpdateTs = now;
				continue;
			}
			await sleep(5000);
			continue;
		}

		if (secondsLeft <= 0) {
			logger.warn("monitor", "Auction ended before snipe window.");
			return null;
		}

		// eBay bid increment logic
		const increment = getBidIncrement(currentBid);
		const nextBid = currentBid + increment;

		if (nextBid > maxBid) {
			logger.warn("monitor", "Next bid would exceed maxBid. Stopping.", {
				nextBid,
				maxBid,
			});
			return null;
		}

		// -------------------------------
		// PRICE DELTA STALENESS DETECTOR
		// -------------------------------
		const staleForMs = Date.now() - lastUpdateTs;

		if (currentBid === lastPrice && staleForMs > 5000 && secondsLeft > 10) {
			// 1) Try soft refresh first
			if (softRefreshCount < 2) {
				logger.info("monitor", "Price stale → soft refresh triggered");
				await softRefresh(page, logger);
				softRefreshCount++;
				const updated = await readAuctionState(page);
				currentBid = updated.currentBid;
				lastPrice = currentBid;
				lastUpdateTs = Date.now();
				continue;
			}

			// 2) If still stale AND safe window >6 sec → hard refresh
			if (secondsLeft > 6 && hardRefreshCount < 1) {
				logger.warn("monitor", "Soft refresh failed → HARD refresh");
				await hardRefresh(page, itemUrl, logger);
				hardRefreshCount++;
				const updated = await readAuctionState(page);
				currentBid = updated.currentBid;
				lastPrice = currentBid;
				lastUpdateTs = Date.now();
				continue;
			}
		}

		// Update last seen bid timestamp
		if (currentBid !== lastPrice) {
			lastPrice = currentBid;
			lastUpdateTs = Date.now();
		}

		// ---------------------------
		// ENTER SNIPE WINDOW
		// ---------------------------
		if (secondsLeft <= snipeWindowStartSeconds) {
			const msToEnd = secondsLeft * 1000;

			const firePlan = snipeOffsetsMs.map((offset, index) => {
				const workerId = `worker-${index + 1}`;
				const fireInMs = Math.max(
					msToEnd - (offset + effectiveLatencyMs),
					0
				);
				return { workerId, fireInMs };
			});

			logger.info("monitor", "Snipe window reached", {
				nextBid,
				secondsLeft,
				firePlan,
				effectiveLatencyMs,
			});

			return { nextBid, firePlan };
		}

		const delay = nextPollDelayMs(secondsLeft, monitorPollIntervals);
		await sleep(delay);
	}
}