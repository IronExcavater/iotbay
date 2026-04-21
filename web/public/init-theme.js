// Runs synchronously before React mounts to set theme attributes on <html>,
// preventing a flash of the wrong colour scheme on page load.
(() => {
    const STORAGE_KEY = 'theme-mode';
    const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)';

    function isThemeMode(value) {
        return value === 'light' || value === 'dark' || value === 'system';
    }

    function resolveSystemMode() {
        return window.matchMedia(SYSTEM_DARK_QUERY).matches ? 'dark' : 'light';
    }

    function applyTheme(resolvedMode) {
        document.documentElement.dataset.theme = resolvedMode;
        document.documentElement.style.colorScheme = resolvedMode;
    }

    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        const mode = isThemeMode(stored) ? stored : 'system';
        const resolvedMode = mode === 'system' ? resolveSystemMode() : mode;

        applyTheme(resolvedMode);
    } catch {
        applyTheme(resolveSystemMode());
    }
})();
