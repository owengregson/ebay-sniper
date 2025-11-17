import { sleep } from "../utils/sleep.js";

/**
 * Measures round-trip time (RTT) to eBay by timing a navigation.
 * This is called only a few times at startup to avoid reload spam.
 *
 * @param {import("puppeteer").Page} page
 * @param {number} samples
 * @param {ReturnType<typeof import("../logger.js").createLogger>} logger
 * @returns {Promise<number>} median RTT in ms
 */
export async function measureRttToEbay(page, samples, logger) {
	const times = [];

	logger.info("timing", `Measuring RTT to eBay (${samples} samples)…`);

	for (let i = 0; i < samples; i += 1) {
		const start = Date.now();
		await page.goto("https://www.ebay.com/", {
			waitUntil: "domcontentloaded",
		});
		const rtt = Date.now() - start;
		times.push(rtt);
		logger.debug("timing", "RTT sample", { index: i, rtt });
		// small delay between samples
		// eslint-disable-next-line no-await-in-loop
		await sleep(250);
	}

	times.sort((a, b) => a - b);
	const median = times[Math.floor(times.length / 2)];
	logger.info("timing", "RTT measurement complete", {
		median,
		samples,
		times,
	});

	return median;
}
