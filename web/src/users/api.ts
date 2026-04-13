import { getJson } from '../services/http';

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

interface UsersResponse {
    items: ManagedUser[];
}

export const usersApi = {
    async list(signal?: AbortSignal): Promise<ManagedUser[]> {
        return (await getJson<UsersResponse>('/api/admin/users', signal)).items;
    },
};
