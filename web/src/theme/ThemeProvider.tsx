import {
    createContext,
    useContext,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type ReactNode,
} from 'react';

export type ThemeMode = 'dark' | 'light' | 'system';
type ResolvedThemeMode = Exclude<ThemeMode, 'system'>;

interface ThemeContextValue {
    mode: ThemeMode;
    resolvedMode: ResolvedThemeMode;
    setMode: (mode: ThemeMode) => void;
}

const STORAGE_KEY = 'theme-mode';
const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const THEME_TRANSITION_CLASS = 'theme-transition';
const ThemeContext = createContext<ThemeContextValue | null>(null);
type ThemeTransitionTimeout = { current: number | null };

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [mode, setMode] = useState<ThemeMode>(() => readInitialTheme());
    const [systemMode, setSystemMode] = useState<ResolvedThemeMode>(() =>
        resolveSystemMode()
    );
    const hasAppliedTheme = useRef(false);
    const transitionTimeout = useRef<number | null>(null);
    const resolvedMode = mode === 'system' ? systemMode : mode;

    useLayoutEffect(() => {
        const root = document.documentElement;

        if (hasAppliedTheme.current && !prefersReducedMotion()) {
            startThemeTransition(root, transitionTimeout);
        }

        applyDocumentTheme(resolvedMode);
        hasAppliedTheme.current = true;
    }, [resolvedMode]);

    useEffect(() => {
        return () => {
            stopThemeTransition(document.documentElement, transitionTimeout);
        };
    }, []);

    useEffect(() => {
        const mediaQuery = window.matchMedia(SYSTEM_DARK_QUERY);

        function syncSystemTheme() {
            setSystemMode(mediaQuery.matches ? 'dark' : 'light');
        }

        syncSystemTheme();
        mediaQuery.addEventListener('change', syncSystemTheme);

        return () => {
            mediaQuery.removeEventListener('change', syncSystemTheme);
        };
    }, []);

    function updateTheme(nextMode: ThemeMode) {
        setMode(nextMode);
        writeStoredTheme(nextMode);
    }

    return (
        <ThemeContext.Provider
            value={{ mode, resolvedMode, setMode: updateTheme }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

export function useThemeMode() {
    const context = useContext(ThemeContext);

    if (context === null) {
        throw new Error('useThemeMode must be used within ThemeProvider');
    }

    return context;
}

function readInitialTheme(): ThemeMode {
    if (typeof window === 'undefined') {
        return 'system';
    }

    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (isThemeMode(stored)) {
            return stored;
        }
    } catch {
        return 'system';
    }

    return 'system';
}

function writeStoredTheme(mode: ThemeMode) {
    try {
        window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
        // Keep the in-memory theme responsive if storage is unavailable.
    }
}

function resolveSystemMode(): ResolvedThemeMode {
    if (typeof window === 'undefined') {
        return 'light';
    }

    return window.matchMedia(SYSTEM_DARK_QUERY).matches ? 'dark' : 'light';
}

function isThemeMode(value: string | null): value is ThemeMode {
    return value === 'light' || value === 'dark' || value === 'system';
}

function applyDocumentTheme(resolvedMode: ResolvedThemeMode) {
    document.documentElement.dataset.theme = resolvedMode;
}

function startThemeTransition(
    root: HTMLElement,
    timeoutRef: ThemeTransitionTimeout
) {
    stopThemeTransition(root, timeoutRef);

    root.classList.add(THEME_TRANSITION_CLASS);
    // Make the transition rule active before the token values change.
    void root.offsetWidth;

    timeoutRef.current = window.setTimeout(
        () => {
            stopThemeTransition(root, timeoutRef);
        },
        getThemeTransitionTime(root) + 50
    );
}

function stopThemeTransition(
    root: HTMLElement,
    timeoutRef: ThemeTransitionTimeout
) {
    if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
    }

    root.classList.remove(THEME_TRANSITION_CLASS);
}

function prefersReducedMotion() {
    return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getThemeTransitionTime(element: Element) {
    const duration = window
        .getComputedStyle(element)
        .getPropertyValue('--theme-transition-duration')
        .trim();

    if (duration.endsWith('ms')) return Number.parseFloat(duration);
    if (duration.endsWith('s')) return Number.parseFloat(duration) * 1000;
    return 0;
}
