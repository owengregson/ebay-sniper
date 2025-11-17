/**
 * Realistic browser fingerprint bundles for multi-context variance.
 * Each page gets a different profile.
 */

export function getRandomProfile() {
	const profiles = [
		{
			name: "mac-chrome-1",
			userAgent:
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
			viewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
			languages: ["en-US", "en"],
			platform: "MacIntel",
			vendor: "Google Inc.",
			renderer: "ANGLE (Apple, Apple M1 Pro, OpenGL 4.1)",
			hardwareConcurrency: 10,
			maxTouchPoints: 0,
			plugins: ["Chrome PDF Plugin", "Chrome PDF Viewer"],
		},
		{
			name: "mac-chrome-2",
			userAgent:
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36",
			viewport: { width: 1680, height: 1050, deviceScaleFactor: 2 },
			languages: ["en-US"],
			platform: "MacIntel",
			vendor: "Google Inc.",
			renderer: "ANGLE (Apple, Apple M3, OpenGL 4.1)",
			hardwareConcurrency: 8,
			maxTouchPoints: 0,
			plugins: ["Chrome PDF Plugin"],
		},
		{
			name: "win-chrome-1",
			userAgent:
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36",
			viewport: { width: 1366, height: 768, deviceScaleFactor: 1 },
			languages: ["en-US", "en"],
			platform: "Win32",
			vendor: "Google Inc.",
			renderer: "ANGLE (NVIDIA GeForce GTX 1660 Super Direct3D11)",
			hardwareConcurrency: 12,
			maxTouchPoints: 0,
			plugins: ["Chrome PDF Plugin", "Chrome PDF Viewer"],
		},
		{
			name: "win-chrome-2",
			userAgent:
				"Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36",
			viewport: { width: 1920, height: 1080, deviceScaleFactor: 1.25 },
			languages: ["en-US"],
			platform: "Win32",
			vendor: "Google Inc.",
			renderer: "ANGLE (Intel UHD Graphics Direct3D12)",
			hardwareConcurrency: 16,
			maxTouchPoints: 1,
			plugins: ["Chrome PDF Viewer"],
		},
		{
			name: "linux-chrome",
			userAgent:
				"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0 Safari/537.36",
			viewport: { width: 1366, height: 768, deviceScaleFactor: 1 },
			languages: ["en-US"],
			platform: "Linux x86_64",
			vendor: "Google Inc.",
			renderer: "ANGLE (AMD Radeon RX 580 OpenGL)",
			hardwareConcurrency: 8,
			maxTouchPoints: 0,
			plugins: [],
		},
		{
			name: "mac-safari-mobile-1",
			userAgent:
				"Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
			viewport: { width: 390, height: 844, deviceScaleFactor: 3 },
			languages: ["en-US"],
			platform: "iPhone",
			vendor: "Apple Computer, Inc.",
			renderer: "Apple A15 GPU",
			hardwareConcurrency: 4,
			maxTouchPoints: 5,
			plugins: [],
		},
		{
			name: "mac-safari-mobile-2",
			userAgent:
				"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/605.1",
			viewport: { width: 393, height: 852, deviceScaleFactor: 3 },
			languages: ["en-US"],
			platform: "iPhone",
			vendor: "Apple Computer, Inc.",
			renderer: "Apple A17 GPU",
			hardwareConcurrency: 6,
			maxTouchPoints: 5,
			plugins: [],
		},
	];

	return profiles[Math.floor(Math.random() * profiles.length)];
}