import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from './AuthProvider';
import {
    buildSignInPath,
    canAccessStaffPortal,
    resolvePostAuthPath,
} from './redirects';

export type ProtectedRouteAccess = 'authenticated' | 'guest' | 'staff';

interface ProtectedRouteProps {
    access?: ProtectedRouteAccess;
    children?: ReactNode;
}

const loadingMessages: Record<ProtectedRouteAccess, string> = {
    authenticated: 'Checking your session',
    guest: 'Checking your session',
    staff: 'Checking staff access',
};

export function ProtectedRoute({
    access = 'authenticated',
    children,
}: ProtectedRouteProps) {
    const { isLoading, user } = useAuth();
    const location = useLocation();
    const requestedPath = location.pathname + location.search;

    if (isLoading) {
        return <p className="py-8 text-slate-500">{loadingMessages[access]}</p>;
    }

    if (access === 'guest') {
        if (user === null) {
            return children;
        }

        return (
            <Navigate
                replace
                to={resolvePostAuthPath(
                    user,
                    new URLSearchParams(location.search).get('next')
                )}
            />
        );
    }

    if (user === null) {
        return (
            <Navigate
                replace
                to={buildSignInPath({
                    nextPath: requestedPath,
                    userType: access === 'staff' ? 'staff' : undefined,
                })}
            />
        );
    }

    if (access === 'staff' && !canAccessStaffPortal(user)) {
        return <Navigate replace to="/account" />;
    }

    return children ?? <Outlet />;
}
