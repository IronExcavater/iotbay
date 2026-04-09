import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react';

import { BackendError } from '../services/http';
import {
    authApi,
    type LoginInput,
    type RegisterInput,
    type RegisterResult,
    type UpdateProfileInput,
    type VerificationResult,
    type User,
} from './api';

interface AuthContextValue {
    isLoading: boolean;
    login: (input: LoginInput) => Promise<User>;
    register: (input: RegisterInput) => Promise<RegisterResult>;
    logout: () => Promise<void>;
    updateMe: (input: UpdateProfileInput) => Promise<User | VerificationResult>;
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
                // The backend cookie is the source of truth for the session, so
                // app startup always asks the API for the current user.
                const currentUser = await authApi.me();

                if (isActive)
                    setUser(currentUser);
            } catch {
                if (isActive)
                    setUser(null);
            } finally {
                if (isActive)
                    setIsLoading(false);
            }
        }

        void loadSession();

        return () => {
            isActive = false;
        };
    }, []);

    const value: AuthContextValue = {
        isLoading,
        async login(input) {
            // Login returns the authenticated user after the backend validates
            // the submitted credentials and issues a fresh session cookie.
            const nextUser = await authApi.login(input);
            setUser(nextUser);
            return nextUser;
        },
        async register(input) {
            return authApi.register(input);
        },
        async logout() {
            try {
                // Logout tells the backend to invalidate the stored session and
                // clears the local authenticated user state regardless of outcome.
                await authApi.logout();
            } catch (error) {
                if (!(error instanceof BackendError) || error.status !== 401)
                    throw error;
            } finally {
                setUser(null);
            }
        },
        async updateMe(input) {
            const result = await authApi.updateMe(input);

            if ('verification' in result) {
                // Changing email starts a new verification flow, so the old
                // session is cleared until the new address is confirmed.
                setUser(null);
                return result;
            }

            // Refresh the in-memory authenticated user with the newly saved
            // registration details returned from the backend.
            setUser(result);
            return result;
        },
        user,
    };

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (context === null)
        throw new Error('useAuth must be used within AuthProvider');

    return context;
}
