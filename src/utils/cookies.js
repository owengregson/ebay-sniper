import fs from "fs";

/**
 * Loads cookies from disk into a Puppeteer page if the file exists.
 * @param {import("puppeteer").Page} page
 * @param {string} cookiesPath
 */
export async function loadCookies(page, cookiesPath) {
	if (!fs.existsSync(cookiesPath)) {
		return; // first-run safe: do nothing
	}

	const raw = fs.readFileSync(cookiesPath, "utf8");
	if (!raw.trim()) return; // empty file safe

	let cookies;
	try {
		cookies = JSON.parse(raw);
	} catch {
		return; // corrupted file safe
	}

	for (const c of cookies) {
		try {
			await page.setCookie(c);
		} catch {
			// ignore malformed cookie
		}
	}
}

/**
 * Persists cookies from a Puppeteer page to disk.
 * @param {import("puppeteer").Page} page
 * @param {string} cookiesPath
 */
export async function saveCookies(page, cookiesPath) {
	const cookies = await page.cookies();
	fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
}