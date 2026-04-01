import { getJson, getResponseField, postJson } from '../services/http';

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    userType: string;
    status: string;
}

export interface LoginInput {
    email: string;
    password: string;
}

export interface RegisterInput extends LoginInput {
    firstName: string;
    lastName: string;
}

interface UserResponse {
    user: User;
}

export const authApi = {
    async login(input: LoginInput, signal?: AbortSignal): Promise<User> {
        const payload = await postJson<UserResponse, LoginInput>(
            '/api/login',
            input,
            signal
        );
        return getResponseField<User>(payload, 'user');
    },

    async register(input: RegisterInput, signal?: AbortSignal): Promise<User> {
        const payload = await postJson<UserResponse, RegisterInput>(
            '/api/register',
            input,
            signal
        );
        return getResponseField<User>(payload, 'user');
    },

    async me(signal?: AbortSignal): Promise<User> {
        const payload = await getJson<UserResponse>('/api/me', signal);
        return getResponseField<User>(payload, 'user');
    },

    logout(signal?: AbortSignal): Promise<void> {
        return postJson<void>('/api/logout', undefined, signal);
    },
};
