import fs from "fs";
import path from "path";
import dotenv from "dotenv";

const accountPath = path.resolve(process.cwd(), "config/account.json");
let account = {};

if (fs.existsSync(accountPath)) {
	const rawAcc = fs.readFileSync(accountPath, "utf8");
	account = JSON.parse(rawAcc);
}

/**
 * Loads and normalizes sniper configuration from JSON + env.
 * @returns {object}
 */
export function loadConfig() {
	const configPath =
		process.env.SNIPER_CONFIG_PATH ||
		path.resolve(process.cwd(), "config/sniper.config.json");

	if (!fs.existsSync(configPath)) {
		throw new Error(`Config file not found at ${configPath}`);
	}

	const raw = fs.readFileSync(configPath, "utf8");
	const json = JSON.parse(raw);

	const itemUrl = process.env.ITEM_URL || json.itemUrl;
	if (!itemUrl) {
		throw new Error(
			"itemUrl must be set in sniper.config.json or via ITEM_URL env"
		);
	}

	const maxBidEnv = process.env.MAX_BID
		? Number(process.env.MAX_BID)
		: undefined;
	const maxBid =
		maxBidEnv && !Number.isNaN(maxBidEnv)
			? maxBidEnv
			: Number(json.maxBid || 0);

	if (!maxBid || Number.isNaN(maxBid)) {
		throw new Error(
			"maxBid must be a valid number in config or env MAX_BID."
		);
	}

	const testMode =
		process.env.TEST_MODE === "true"
			? true
			: process.env.TEST_MODE === "false"
			? false
			: Boolean(json.testMode);

	const workers = Number(json.workers || 2);
	if (workers !== 2) {
		throw new Error("This build is configured for exactly 2 workers.");
	}

	const cookiesPath = json.cookiesPath || "./cookies.json";

	const ebayUsername = account.ebayUsername;
	const ebayPassword = account.ebayPassword;

	if (!ebayUsername || !ebayPassword) {
		throw new Error(
			"Missing credentials: Set ebayUsername and ebayPassword in config/account.json."
		);
	}

	const timing = json.timing || {};
	const browser = json.browser || {};
	const logging = json.logging || {};

	return Object.freeze({
		itemUrl,
		maxBid,
		testMode,
		workers,
		cookiesPath,
		ebayUsername,
		ebayPassword,
		timing: {
			snipeOffsetsMs: timing.snipeOffsetsMs || [1900, 1600],
			snipeWindowStartSeconds: timing.snipeWindowStartSeconds || 12,
			monitorPollIntervals: {
				gt300s: timing.monitorPollIntervals?.gt300s ?? 60000,
				gt60s: timing.monitorPollIntervals?.gt60s ?? 20000,
				gt15s: timing.monitorPollIntervals?.gt15s ?? 5000,
				gt10s: timing.monitorPollIntervals?.gt10s ?? 2000,
				lte10s: timing.monitorPollIntervals?.lte10s ?? 1000,
			},
			maxSafeReloadIntervalMs: timing.maxSafeReloadIntervalMs ?? 120000,
			rttSampleCount: timing.rttSampleCount ?? 3,
			rttSafetyBufferMs: timing.rttSafetyBufferMs ?? 200,
		},
		browser: {
			headless:
				typeof browser.headless === "boolean"
					? browser.headless
					: false,
			defaultViewport:
				"defaultViewport" in browser ? browser.defaultViewport : null,
			args: browser.args || ["--no-sandbox"],
		},
		logging: {
			level: logging.level || "info",
		},
	});
}