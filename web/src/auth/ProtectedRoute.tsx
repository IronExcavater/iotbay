import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from './AuthProvider';
import { buildSignInPath, canAccessStaffPortal, resolvePostAuthPath } from './redirects';

export type ProtectedRouteAccess = 'authenticated' | 'guest' | 'staff';

interface ProtectedRouteProps {
    access?: ProtectedRouteAccess;
    children?: ReactNode;
}

export function ProtectedRoute({
    access = 'authenticated',
    children,
}: ProtectedRouteProps) {
    const { isLoading, user } = useAuth();
    const location = useLocation();
    const requestedPath = location.pathname + location.search;
    const content = children ?? <Outlet />;

    if (access === 'guest') {
        if (user === null)
            return content;

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

    if (isLoading)
        return null;

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

    return content;
}
