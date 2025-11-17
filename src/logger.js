/**
 * Simple structured logger with levels and component tags.
 */
const LEVELS = ["debug", "info", "warn", "error"];

/**
 * @param {"debug"|"info"|"warn"|"error"} level
 */
export function createLogger(level = "info") {
	const minIndex = LEVELS.indexOf(level);
	const ts = () => new Date().toISOString();

	function log(lvl, component, msg, meta) {
		const idx = LEVELS.indexOf(lvl);
		if (idx < minIndex) return;

		const payload = {
			level: lvl.toUpperCase(),
			time: ts(),
			component,
			message: msg,
		};
		if (meta !== undefined) payload.meta = meta;

		// eslint-disable-next-line no-console
		console.log(JSON.stringify(payload));
	}

	return {
		debug: (component, msg, meta) => log("debug", component, msg, meta),
		info: (component, msg, meta) => log("info", component, msg, meta),
		warn: (component, msg, meta) => log("warn", component, msg, meta),
		error: (component, msg, meta) => log("error", component, msg, meta),
	};
}