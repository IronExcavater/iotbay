import type { User } from './api';

type RedirectUser = Pick<User, 'permission' | 'userType'>;
type AuthUserType = 'staff';

export interface AuthPathOptions {
    email?: string;
    nextPath?: string;
}

export function buildSignInPath({
    email,
    nextPath,
    userType,
}: {
    email?: string;
    nextPath?: string;
    userType?: AuthUserType;
} = {}) {
    return buildAuthPath(
        userType === 'staff' ? '/staff/sign-in' : '/sign-in',
        {
            email,
            nextPath: normalizeNextPath(
                nextPath,
                userType === 'staff' ? '/admin' : ''
            ),
        }
    );
}

export function buildSignUpPath({ email, nextPath }: AuthPathOptions = {}) {
    return buildAuthPath('/sign-up', {
        email,
        nextPath: normalizeNextPath(nextPath),
    });
}

export function buildForgotPasswordPath({
    email,
    nextPath,
    userType,
}: {
    email?: string;
    nextPath?: string;
    userType?: AuthUserType;
} = {}) {
    return buildAuthPath('/forgot-password', {
        email,
        nextPath: normalizeNextPath(nextPath),
        userType,
    });
}

export function buildVerifyEmailPath({
    context,
    downloaded = false,
    email,
    nextPath,
    userType,
}: {
    context: 'account' | 'signup';
    downloaded?: boolean;
    email: string;
    nextPath?: string;
    userType?: AuthUserType;
}) {
    const path = buildAuthPath('/verify-email', {
        email,
        nextPath: normalizeNextPath(nextPath),
        userType,
    });
    const query = new URL(path, 'http://localhost');
    query.searchParams.set('context', context);

    if (downloaded)
        query.searchParams.set('downloaded', '1');

    return query.pathname + query.search;
}

export function canAccessStaffPortal(user: RedirectUser | null | undefined) {
    return Boolean(user?.userType === 'staff' && user.permission);
}

export function resolvePostAuthPath(
    user: RedirectUser,
    nextPath?: string | null
) {
    // Guests can be sent to /admin as a desired destination, but customer
    // accounts should land on /account after auth instead of bouncing through
    // a staff-only page.
    const requestedPath = normalizeNextPath(nextPath, '/');

    if (requestedPath.startsWith('/admin') && !canAccessStaffPortal(user)) {
        return '/account';
    }

    return requestedPath;
}

function buildAuthPath(
    pathname: string,
    {
        email,
        nextPath,
        userType,
    }: AuthPathOptions & { userType?: AuthUserType } = {}
) {
    const query = new URLSearchParams();
    const trimmedEmail = email?.trim();
    const trimmedNextPath = normalizeNextPath(nextPath);

    if (trimmedEmail)
        query.set('email', trimmedEmail);

    if (trimmedNextPath)
        query.set('next', trimmedNextPath);

    if (userType === 'staff')
        query.set('userType', 'staff');

    const queryString = query.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
}

export function normalizeNextPath(nextPath?: string | null, fallback = '') {
    const trimmedNextPath = nextPath?.trim();

    if (!trimmedNextPath)
        return fallback;

    if (!trimmedNextPath.startsWith('/') || trimmedNextPath.startsWith('//'))
        return fallback;

    return trimmedNextPath;
}
