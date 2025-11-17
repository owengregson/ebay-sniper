import { sleep } from "../utils/sleep.js";

/**
 * Human-like session prewarming:
 * - Visit homepage
 * - Scroll
 * - Click 1–2 random links
 * - Wait realistic timings
 * This builds cookies, localStorage, and session activity.
 */

export async function prewarmSession(page, logger) {
	logger.info("stealth-prewarm", "Starting session prewarm…");

	await page.goto("https://www.ebay.com/", { waitUntil: "networkidle2" });

	await sleep(800 + Math.random() * 1200);

	// Small scroll like a real user
	await page.evaluate(() => {
		window.scrollBy(0, Math.random() * 400 + 200);
	});

	await sleep(500 + Math.random() * 900);

	// Click a random harmless link
	const links = await page.$$("a");
	if (links.length > 0) {
		const target =
			links[Math.floor(Math.random() * Math.min(30, links.length))];
		try {
			await target.click();
			await page.waitForNavigation({
				waitUntil: "domcontentloaded",
				timeout: 5000,
			});
		} catch {}
	}

	await sleep(600 + Math.random() * 1400);

	logger.info("stealth-prewarm", "Session prewarm complete.");
}