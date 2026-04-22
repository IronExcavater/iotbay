import type { User } from '../auth/api';
import type { ManagedUser } from './api';

type PermissionValue = string | null | undefined;

export function permissionRank(permission: PermissionValue) {
    if (permission === 'superadmin') {
        return 2;
    }
    if (permission === 'admin') {
        return 1;
    }
    return 0;
}

export function canEditManagedUser(actor: User | null, target: ManagedUser) {
    if (!actor || actor.id === target.id) {
        return false;
    }
    if (target.userType !== 'staff') {
        return true;
    }

    return (
        permissionRank(target.permission) <= permissionRank(actor.permission)
    );
}

export function canChangeManagedUserStatus(
    actor: User | null,
    target: ManagedUser
) {
    if (!actor || actor.id === target.id) {
        return false;
    }
    if (target.userType !== 'staff') {
        return true;
    }

    return permissionRank(target.permission) < permissionRank(actor.permission);
}

export function manageablePermissionOptions(actor: User | null) {
    return [
        {
            description: 'Manage products and operations.',
            label: 'Admin',
            value: 'admin',
        },
        ...(permissionRank(actor?.permission) >= 2
            ? [
                  {
                      description:
                          'Manage products, operations, users and invitations.',
                      label: 'Superadmin',
                      value: 'superadmin',
                  },
              ]
            : []),
    ] satisfies Array<{
        description: string;
        label: string;
        value: string;
    }>;
}
