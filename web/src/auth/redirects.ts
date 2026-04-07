import type { User } from './api';

type RedirectUser = Pick<User, 'permission' | 'userType'>;

export function buildSignInPath({
    email,
    nextPath,
    userType,
}: {
    email?: string;
    nextPath?: string;
    userType?: 'staff';
} = {}) {
    const query = new URLSearchParams({ mode: 'signin' });
    const trimmedEmail = email?.trim();
    const trimmedNextPath = nextPath?.trim();

    if (trimmedEmail) {
        query.set('email', trimmedEmail);
    }
    if (userType) {
        query.set('userType', userType);
    }

    const redirectTarget =
        trimmedNextPath || (userType === 'staff' ? '/admin' : '');
    if (redirectTarget) {
        query.set('next', redirectTarget);
    }

    return `/auth?${query.toString()}`;
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
    const requestedPath = nextPath?.trim() || '/';

    if (requestedPath.startsWith('/admin') && !canAccessStaffPortal(user)) {
        return '/account';
    }

    return requestedPath;
}
