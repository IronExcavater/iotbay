import {
    createContext,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';

export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeContextValue {
    mode: ThemeMode;
    resolvedMode: Exclude<ThemeMode, 'system'>;
    setMode: (mode: ThemeMode) => void;
}

const STORAGE_KEY = 'theme-mode';
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [mode, setMode] = useState<ThemeMode>(() => readInitialTheme());
    const [resolvedMode, setResolvedMode] = useState<Exclude<
        ThemeMode,
        'system'
    >>(() => resolveSystemMode());

    useEffect(() => {
        const nextResolvedMode = mode === 'system' ? resolveSystemMode() : mode;
        setResolvedMode(nextResolvedMode);

        if (mode === 'system') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.dataset.theme = mode;
        }
        document.documentElement.style.colorScheme = nextResolvedMode;
        window.localStorage.setItem(STORAGE_KEY, mode);
    }, [mode]);

    useLayoutEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        function syncSystemTheme() {
            if (mode !== 'system') {
                return;
            }

            const nextResolvedMode = mediaQuery.matches ? 'dark' : 'light';
            setResolvedMode(nextResolvedMode);
            document.documentElement.removeAttribute('data-theme');
            document.documentElement.style.colorScheme = nextResolvedMode;
        }

        syncSystemTheme();
        mediaQuery.addEventListener('change', syncSystemTheme);

        return () => {
            mediaQuery.removeEventListener('change', syncSystemTheme);
        };
    }, [mode]);

    const value = useMemo<ThemeContextValue>(
        () => ({
            mode,
            resolvedMode,
            setMode,
        }),
        [mode, resolvedMode]
    );

    return (
        <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
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

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
    }

    return 'system';
}

function resolveSystemMode(): Exclude<ThemeMode, 'system'> {
    if (typeof window === 'undefined') {
        return 'light';
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
}
