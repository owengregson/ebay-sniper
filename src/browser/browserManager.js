import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { loadCookies } from "../utils/cookies.js";

/**
 * Initializes Puppeteer with stealth plugin and launches the browser.
 * @param {object} browserConfig
 * @param {import("../logger.js").createLogger} logger
 * @returns {Promise<import("puppeteer").Browser>}
 */
export async function launchBrowser(browserConfig, logger) {
	puppeteer.use(StealthPlugin());

	logger.info("browser", "Launching browser…", browserConfig);

	const browser = await puppeteer.launch({
		headless: browserConfig.headless,
		defaultViewport: browserConfig.defaultViewport,
		args: browserConfig.args || ["--no-sandbox"],
	});

	return browser;
}

/**
 * Creates a new page with cookies loaded.
 * @param {import("puppeteer").Browser} browser
 * @param {string} name
 * @param {string} cookiesPath
 * @param {ReturnType<typeof import("../logger.js").createLogger>} logger
 * @returns {Promise<import("puppeteer").Page>}
 */
export async function createNamedPage(browser, name, cookiesPath, logger) {
	const page = await browser.newPage();

	logger.debug("browser", `Created page: ${name}`);

	await loadCookies(page, cookiesPath);

	return page;
}
