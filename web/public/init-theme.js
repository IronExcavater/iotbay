// Runs synchronously before React mounts to set the theme class on <html>,
// preventing a flash of the wrong colour scheme on page load.
(() => {
    try {
        const stored = window.localStorage.getItem('theme-mode');
        const mode =
            stored === 'light' || stored === 'dark'
                ? stored
                : window.matchMedia('(prefers-color-scheme: dark)').matches
                  ? 'dark'
                  : 'light';
        document.documentElement.dataset.theme = mode;
        document.documentElement.style.colorScheme = mode;
    } catch {
        // Ignore storage access failures and fall back to CSS defaults.
    }
})();
