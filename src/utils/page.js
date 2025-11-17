import { sleep } from "./sleep.js";

/**
 * Clicks an element if it exists.
 * @param {import("puppeteer").Page} page
 * @param {string} selector
 * @returns {Promise<boolean>}
 */
export async function clickIfExists(page, selector) {
	const el = await page.$(selector);
	if (el) {
		await el.click();
		await sleep(350);
		return true;
	}
	return false;
}