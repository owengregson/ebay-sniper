/**
 * Performs the actual bid using your existing, verified logic.
 *
 * - Opens the bid popup (#bidBtn_btn)
 * - Tries power-bid buttons first
 * - Falls back to manual bid textbox + primary button
 *
 * @param {import("puppeteer").Page} page
 * @param {number} bidAmount
 * @param {boolean} testMode
 * @param {ReturnType<typeof import("../logger.js").createLogger>} logger
 * @returns {Promise<boolean>}
 */
export async function performBid(page, bidAmount, testMode, logger) {
	if (testMode) {
		logger.info("bid", `[TEST MODE] Would bid`, { bidAmount });
		return true;
	}

	logger.info("bid", "Opening bid popup…");
	await page.click("#bidBtn_btn");
	await page.waitForSelector(".place-bid-wrapper-ocv", { visible: true });

	// Power-bid
	const btns = await page.$$(".place-bid-actions__powerbids-wrapper button");
	for (const btn of btns) {
		// eslint-disable-next-line no-await-in-loop
		const txt = await page.evaluate((el) => el.innerText, btn);
		if (txt.includes(`$${bidAmount}`)) {
			logger.info("bid", "Clicking power-bid button", { label: txt });
			// eslint-disable-next-line no-await-in-loop
			await btn.click();
			return true;
		}
	}

	// Manual entry
	const input = await page.$('input[id*="price"]');
	if (!input) throw new Error("Bid textbox not found.");

	await input.type(String(bidAmount), { delay: 50 });

	const incBtn = await page.$("button.btn--primary:not([disabled])");
	if (!incBtn) throw new Error("Increase/submit bid button disabled.");

	logger.info("bid", "Submitting manual bid", { bidAmount });
	await incBtn.click();

	return true;
}
