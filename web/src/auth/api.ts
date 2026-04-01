import { getJson, patchJson, postJson } from '../services/http';

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

export interface EmailDownload {
    filename: string;
    html: string;
}

export interface RegisterResult {
    download?: EmailDownload;
    verification: {
        email: string;
    };
}

export interface ForgotPasswordInput {
    email: string;
}

interface ForgotPasswordResponse {
    download?: EmailDownload;
}

export interface ResetPasswordInput {
    password: string;
    token: string;
}

export interface UpdateProfileInput {
    email: string;
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

    register(
        input: RegisterInput,
        signal?: AbortSignal
    ): Promise<RegisterResult> {
        return postJson<RegisterResult, RegisterInput>(
            '/api/register',
            input,
            signal
        );
    },

    async verifyEmail(token: string, signal?: AbortSignal): Promise<User> {
        return (
            await postJson<UserResponse, { token: string }>(
                '/api/verify-email',
                { token },
                signal
            )
        ).user;
    },

    async me(signal?: AbortSignal): Promise<User> {
        return (await getJson<UserResponse>('/api/me', signal)).user;
    },

    async updateMe(
        input: UpdateProfileInput,
        signal?: AbortSignal
    ): Promise<User> {
        return (
            await patchJson<UserResponse, UpdateProfileInput>(
                '/api/me',
                input,
                signal
            )
        ).user;
    },

    forgotPassword(
        input: ForgotPasswordInput,
        signal?: AbortSignal
    ): Promise<ForgotPasswordResponse | undefined> {
        return postJson<
            ForgotPasswordResponse | undefined,
            ForgotPasswordInput
        >('/api/forgot-password', input, signal);
    },

    resetPassword(
        input: ResetPasswordInput,
        signal?: AbortSignal
    ): Promise<{ ok: boolean }> {
        return postJson<{ ok: boolean }, ResetPasswordInput>(
            '/api/reset-password',
            input,
            signal
        );
    },

    logout(signal?: AbortSignal): Promise<void> {
        return postJson<void>('/api/logout', undefined, signal);
    },
};
