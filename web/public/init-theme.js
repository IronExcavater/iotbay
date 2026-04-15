// Runs synchronously before React mounts to set the theme class on <html>,
// preventing a flash of the wrong colour scheme on page load.
(() => {
    try {
        const stored = window.localStorage.getItem('theme-mode');
        const resolvedMode = window.matchMedia('(prefers-color-scheme: dark)')
            .matches
            ? 'dark'
            : 'light';

        if (stored === 'light' || stored === 'dark') {
            document.documentElement.dataset.theme = stored;
            document.documentElement.style.colorScheme = stored;
            return;
        }

        document.documentElement.removeAttribute('data-theme');
        document.documentElement.style.colorScheme = resolvedMode;
    } catch {
        // Ignore storage access failures and fall back to CSS defaults.
    }
})();
