import { getJson, postJson } from '../services/http';

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
        return (
            await postJson<UserResponse, LoginInput>(
                '/api/login',
                input,
                signal
            )
        ).user;
    },

    async register(input: RegisterInput, signal?: AbortSignal): Promise<User> {
        return (
            await postJson<UserResponse, RegisterInput>(
                '/api/register',
                input,
                signal
            )
        ).user;
    },

    async me(signal?: AbortSignal): Promise<User> {
        return (await getJson<UserResponse>('/api/me', signal)).user;
    },

    logout(signal?: AbortSignal): Promise<void> {
        return postJson<void>('/api/logout', undefined, signal);
    },
};
