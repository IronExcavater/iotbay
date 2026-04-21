import {
    createContext,
    useContext,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type ReactNode,
    type RefObject,
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
const THEME_TRANSITION_CLASS = 'theme-transition';
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [mode, setMode] = useState<ThemeMode>(() => readInitialTheme());
    const [systemMode, setSystemMode] = useState<ResolvedThemeMode>(() =>
        resolveSystemMode()
    );
    const previousResolvedMode = useRef<ResolvedThemeMode | null>(null);
    const transitionTimeout = useRef<number | null>(null);
    const transitionFrames = useRef<number[]>([]);
    const resolvedMode = mode === 'system' ? systemMode : mode;

    useLayoutEffect(() => {
        startThemeTransition(
            previousResolvedMode.current !== null &&
                previousResolvedMode.current !== resolvedMode,
            transitionTimeout,
            transitionFrames
        );
        applyDocumentTheme(resolvedMode);
        previousResolvedMode.current = resolvedMode;
    }, [resolvedMode]);

    useEffect(() => {
        return () => {
            clearThemeTransitionSchedule(transitionTimeout, transitionFrames);
            document.documentElement.classList.remove(THEME_TRANSITION_CLASS);
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
    document.documentElement.style.colorScheme = resolvedMode;
}

function startThemeTransition(
    shouldTransition: boolean,
    timeoutRef: RefObject<number | null>,
    frameRef: RefObject<number[]>
) {
    if (!shouldTransition || prefersReducedMotion()) return;

    clearThemeTransitionSchedule(timeoutRef, frameRef);

    const root = document.documentElement;
    root.classList.add(THEME_TRANSITION_CLASS);
    // Make the transition rule active before changing data-theme.
    void root.offsetWidth;

    timeoutRef.current = window.setTimeout(() => {
        timeoutRef.current = null;
        removeThemeTransitionAfterPaint(root, frameRef);
    }, getThemeTransitionTime(root));
}

function removeThemeTransitionAfterPaint(
    root: HTMLElement,
    frameRef: RefObject<number[]>
) {
    // Let the final transitioned colors paint before restoring local transitions.
    frameRef.current = [
        window.requestAnimationFrame(() => {
            frameRef.current = [
                window.requestAnimationFrame(() => {
                    root.classList.remove(THEME_TRANSITION_CLASS);
                    frameRef.current = [];
                }),
            ];
        }),
    ];
}

function clearThemeTransitionSchedule(
    timeoutRef: RefObject<number | null>,
    frameRef: RefObject<number[]>
) {
    if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
    }

    for (const frame of frameRef.current) {
        window.cancelAnimationFrame(frame);
    }
    frameRef.current = [];
}

function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getThemeTransitionTime(element: Element) {
    const styles = window.getComputedStyle(element);
    return parseTransitionTime(
        styles.getPropertyValue('--theme-transition-duration').trim()
    );
}

function parseTransitionTime(value: string) {
    if (value.endsWith('ms')) return Number.parseFloat(value);
    if (value.endsWith('s')) return Number.parseFloat(value) * 1000;
    return 0;
}
