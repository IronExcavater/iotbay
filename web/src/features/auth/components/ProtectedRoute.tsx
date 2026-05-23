import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@features/auth/AuthProvider';
import {
    buildSignInPath,
    canAccessSuperadmin,
    canAccessStaffPortal,
    resolvePostAuthPath,
} from '@features/auth/redirects';

export type ProtectedRouteAccess =
    | 'authenticated'
    | 'guest'
    | 'staff'
    | 'superadmin';

interface ProtectedRouteProps {
    access?: ProtectedRouteAccess;
    children?: ReactNode;
}

export function ProtectedRoute({
    access = 'authenticated',
    children,
}: ProtectedRouteProps) {
    const { authError, isLoading, user } = useAuth();
    const location = useLocation();
    const requestedPath = location.pathname + location.search;
    const content = children ?? <Outlet />;

    if (access === 'guest') {
        if (user === null) return content;

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

    if (isLoading) return null;

    if (authError && user === null) {
        return (
            <section className="mx-auto grid max-w-lg gap-3 px-4 py-12 text-center">
                <h1 className="text-ui-900 text-2xl font-semibold">
                    Session check failed
                </h1>
                <p className="text-ui-600 text-sm">{authError}</p>
            </section>
        );
    }

    if (user === null) {
        return (
            <Navigate
                replace
                to={buildSignInPath({
                    nextPath: requestedPath,
                    userType:
                        access === 'staff' || access === 'superadmin'
                            ? 'staff'
                            : undefined,
                })}
            />
        );
    }

    if (
        (access === 'staff' || access === 'superadmin') &&
        !canAccessStaffPortal(user)
    ) {
        return <Navigate replace to="/account" />;
    }

    if (access === 'superadmin' && !canAccessSuperadmin(user)) {
        return <Navigate replace to="/admin" />;
    }

    return content;
}
