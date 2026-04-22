import { getJson, patchJson } from '../services/http';

export interface ManagedUser {
    addressLabel?: string | null;
    country?: string | null;
    designation?: string | null;
    email: string;
    firstName: string;
    id: string;
    lastName: string;
    permission?: string | null;
    phoneNumber?: string | null;
    staffId?: string | null;
    status: string;
    userType: string;
}

export interface UpdateManagedUserInput {
    designation?: string;
    email: string;
    firstName: string;
    lastName: string;
    permission?: string;
    staffId?: string;
}

export interface UpdateManagedUserStatusInput {
    status: 'active' | 'disabled';
}

interface UsersResponse {
    items: ManagedUser[];
}

interface UserResponse {
    user: ManagedUser;
}

export const usersApi = {
    async list(signal?: AbortSignal): Promise<ManagedUser[]> {
        return (await getJson<UsersResponse>('/api/admin/users', signal)).items;
    },

    async update(
        userId: string,
        input: UpdateManagedUserInput,
        signal?: AbortSignal
    ): Promise<ManagedUser> {
        return (
            await patchJson<UserResponse, UpdateManagedUserInput>(
                `/api/admin/users/${userId}`,
                input,
                signal
            )
        ).user;
    },

    async updateStatus(
        userId: string,
        input: UpdateManagedUserStatusInput,
        signal?: AbortSignal
    ): Promise<ManagedUser> {
        return (
            await patchJson<UserResponse, UpdateManagedUserStatusInput>(
                `/api/admin/users/${userId}/status`,
                input,
                signal
            )
        ).user;
    },
};
