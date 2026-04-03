import { getJson, patchJson, postJson } from '../services/http';

export interface User {
    addressLabel?: string | null;
    addressLineOne?: string | null;
    addressLineTwo?: string | null;
    country?: string | null;
    designation?: string | null;
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    postcode?: string | null;
    permission?: string | null;
    phoneNumber?: string | null;
    state?: string | null;
    suburb?: string | null;
    userType: string;
    status: string;
}

export interface LoginInput {
    email: string;
    password: string;
    userType?: string;
}

export interface RegisterInput extends LoginInput {
    addressLineOne?: string;
    addressLineTwo?: string;
    country?: string;
    firstName: string;
    lastName: string;
    postcode?: string;
    phoneCountry?: string;
    phoneNumber?: string;
    state?: string;
    suburb?: string;
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
    userType?: string;
}

export interface ResendVerificationInput {
    email: string;
    userType?: string;
}

export interface ChangePendingEmailInput {
    currentEmail: string;
    email: string;
    password: string;
    userType?: string;
}

interface ForgotPasswordResponse {
    download?: EmailDownload;
}

export interface ResetPasswordInput {
    password: string;
    token: string;
}

export interface UpdateProfileInput {
    addressLineOne?: string;
    addressLineTwo?: string;
    country?: string;
    currentPassword?: string;
    designation?: string;
    email: string;
    firstName: string;
    lastName: string;
    postcode?: string;
    permission?: string;
    phoneCountry?: string;
    phoneNumber?: string;
    state?: string;
    suburb?: string;
}

export interface VerificationResult {
    download?: EmailDownload;
    verification: {
        email: string;
    };
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
    ): Promise<User | VerificationResult> {
        const response = await patchJson<
            UserResponse | VerificationResult,
            UpdateProfileInput
        >('/api/me', input, signal);

        return 'user' in response ? response.user : response;
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

    resendVerification(
        input: ResendVerificationInput,
        signal?: AbortSignal
    ): Promise<{ download?: EmailDownload; ok?: boolean }> {
        return postJson<
            { download?: EmailDownload; ok?: boolean },
            ResendVerificationInput
        >('/api/resend-verification', input, signal);
    },

    changePendingEmail(
        input: ChangePendingEmailInput,
        signal?: AbortSignal
    ): Promise<VerificationResult> {
        return postJson<VerificationResult, ChangePendingEmailInput>(
            '/api/change-pending-email',
            input,
            signal
        );
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
