import { buildInjectionScript } from "./injectProfile.js";

/**
 * Applies fingerprint overrides & user agent to a single page.
 */
export async function applyStealthProfile(page, profile, logger) {
	logger.info("stealth", `Applying profile: ${profile.name}`);

	await page.setUserAgent(profile.userAgent);
	await page.setViewport(profile.viewport);

	await page.setExtraHTTPHeaders({
		"Accept-Language": profile.languages.join(","),
	});

	const script = buildInjectionScript(profile);
	await page.evaluateOnNewDocument(script);
}