import { useCallback, useEffect, useState } from 'react';

import { usersApi, type ManagedUser } from '@features/users/api';
import { toErrorMessage } from '@shared/services/http';

export function useManagedUsers() {
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [usersError, setUsersError] = useState<string | null>(null);

    const loadUsers = useCallback(async (signal?: AbortSignal) => {
        setIsLoadingUsers(true);

        try {
            setUsers(sortUsers(await usersApi.list(signal)));
            setUsersError(null);
        } catch (error) {
            if (!signal?.aborted) {
                setUsersError(
                    toErrorMessage(error, 'Unable to load registered users')
                );
            }
        } finally {
            if (!signal?.aborted) {
                setIsLoadingUsers(false);
            }
        }
    }, []);

    useEffect(() => {
        const abortController = new AbortController();

        void loadUsers(abortController.signal);
        return () => abortController.abort();
    }, [loadUsers]);

    const replaceUser = useCallback((user: ManagedUser) => {
        setUsers((current) =>
            sortUsers(
                current.map((item) => (item.id === user.id ? user : item))
            )
        );
    }, []);

    return {
        isLoadingUsers,
        loadUsers,
        replaceUser,
        users,
        usersError,
    };
}

function sortUsers(users: ManagedUser[]) {
    return [...users].sort((left, right) =>
        `${left.firstName} ${left.lastName} ${left.email}`.localeCompare(
            `${right.firstName} ${right.lastName} ${right.email}`
        )
    );
}
