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
        let isActive = true;

        async function loadSession() {
            try {
                const currentUser = await authApi.me();
                if (isActive) {
                    setUser(currentUser);
                }
            } catch (error) {
                if (
                    isActive &&
                    error instanceof BackendError &&
                    error.status === 401
                ) {
                    setUser(null);
                } else if (isActive) {
                    setUser(null);
                }
            } finally {
                if (isActive) {
                    setIsLoading(false);
                }
            }
        }

        void loadSession();
        return () => {
            isActive = false;
        };
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
