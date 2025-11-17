import { getRandomProfile } from "./randomProfile.js";
import { applyStealthProfile } from "./stealthInit.js";

/**
 * Creates a Puppeteer page with:
 * - its own fingerprint profile
 * - stealth fingerprint overrides
 */
export async function createStealthPage(browser, logger) {
	const page = await browser.newPage();
	const profile = getRandomProfile();
	await applyStealthProfile(page, profile, logger);
	return { page, profile };
}