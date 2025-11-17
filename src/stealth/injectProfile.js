export function buildInjectionScript(profile) {
	return `
        Object.defineProperty(navigator, 'platform', {
            get: () => '${profile.platform}'
        });

        Object.defineProperty(navigator, 'language', {
            get: () => '${profile.languages[0]}'
        });

        Object.defineProperty(navigator, 'languages', {
            get: () => ${JSON.stringify(profile.languages)}
        });

        Object.defineProperty(navigator, 'hardwareConcurrency', {
            get: () => ${profile.hardwareConcurrency}
        });

        Object.defineProperty(navigator, 'maxTouchPoints', {
            get: () => ${profile.maxTouchPoints}
        });

        Object.defineProperty(navigator, 'plugins', {
            get: () => ${JSON.stringify(profile.plugins)}
        });

        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(param) {
            if (param === 37445) return '${profile.vendor}';
            if (param === 37446) return '${profile.renderer}';
            return getParameter.apply(this, [param]);
        };
    `;
}