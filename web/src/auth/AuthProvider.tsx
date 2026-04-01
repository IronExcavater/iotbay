import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react';

import { BackendError } from '../services/http';
import { authApi, type LoginInput, type RegisterInput, type User } from './api';

interface AuthContextValue {
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (input: LoginInput) => Promise<User>;
    logout: () => Promise<void>;
    register: (input: RegisterInput) => Promise<User>;
    user: User | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const abortController = new AbortController();

        async function loadCurrentUser() {
            try {
                setUser(await authApi.me(abortController.signal));
            } catch (error) {
                if (error instanceof BackendError && error.status === 401) {
                    setUser(null);
                    return;
                }

                if (!abortController.signal.aborted) {
                    setUser(null);
                }
            } finally {
                if (!abortController.signal.aborted) {
                    setIsLoading(false);
                }
            }
        }

        void loadCurrentUser();
        return () => abortController.abort();
    }, []);

    const value: AuthContextValue = {
        isAuthenticated: user !== null,
        isLoading,
        async login(input) {
            const nextUser = await authApi.login(input);
            setUser(nextUser);
            return nextUser;
        },
        async logout() {
            try {
                await authApi.logout();
            } catch (error) {
                if (!(error instanceof BackendError) || error.status !== 401) {
                    throw error;
                }
            } finally {
                setUser(null);
            }
        },
        async register(input) {
            const nextUser = await authApi.register(input);
            setUser(nextUser);
            return nextUser;
        },
        user,
    };

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === null) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
