import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';

export type ThemeMode = 'dark' | 'light';

interface ThemeContextValue {
    mode: ThemeMode;
    toggleMode: () => void;
}

const STORAGE_KEY = 'theme-mode';
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [mode, setMode] = useState<ThemeMode>(() => readInitialTheme());

    useEffect(() => {
        document.documentElement.dataset.theme = mode;
        document.documentElement.style.colorScheme = mode;
        window.localStorage.setItem(STORAGE_KEY, mode);
    }, [mode]);

    const value = useMemo<ThemeContextValue>(
        () => ({
            mode,
            toggleMode() {
                setMode((current) => (current === 'dark' ? 'light' : 'dark'));
            },
        }),
        [mode]
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
        return 'light';
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
        return stored;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
}
