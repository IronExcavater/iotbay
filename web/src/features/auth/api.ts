import {
    deleteJsonResponse,
    getJson,
    patchJson,
    postJson,
} from '@shared/services/http';

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
    profileImageUrl?: string | null;
    staffId?: string | null;
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

export interface LoginMfaChallenge {
    challengeId: string;
    expiresAt: string;
    maskedDestination: string;
}

export interface LoginMfaVerifyInput {
    challengeId: string;
    code: string;
    trustBrowser?: boolean;
}

export type LoginResult =
    | { mfaChallenge: LoginMfaChallenge; download?: EmailDownload }
    | { user: User };

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
    profileImageUrl?: string;
    staffId?: string;
    state?: string;
    suburb?: string;
}

export interface VerificationResult {
    download?: EmailDownload;
    verification: {
        email: string;
    };
}

export interface InviteStaffInput {
    designation: string;
    email: string;
    permission?: string;
    staffId: string;
}

export interface StaffInvitationDetails {
    user: User;
}

export interface CompleteStaffInvitationInput {
    firstName: string;
    lastName: string;
    password: string;
    token: string;
}

interface UserResponse {
    user: User;
}

interface SessionsResponse {
    items: SessionInfo[];
}

export interface SessionInfo {
    authMethod: string;
    createdAt: string;
    deviceLabel: string;
    endedAt?: string | null;
    endedReason?: string | null;
    expiresAt: string;
    id: string;
    isCurrent: boolean;
    isTrusted: boolean;
    lastSeenAt: string;
    latestEventType?: string | null;
    latestIpAddress?: string | null;
    latestUserAgent?: string | null;
    mfaVerifiedAt?: string | null;
    trustedExpiresAt?: string | null;
    userEmail?: string | null;
    userId?: string | null;
    userName?: string | null;
    userProfileImageUrl?: string | null;
}

export interface UserMfaSettings {
    createdAt: string;
    emailEnabled: boolean;
    enabledAt?: string | null;
    updatedAt: string;
}

export const authApi = {
    login(input: LoginInput, signal?: AbortSignal): Promise<LoginResult> {
        return postJson<LoginResult, LoginInput>('/api/login', input, signal);
    },

    async verifyLoginMfa(
        input: LoginMfaVerifyInput,
        signal?: AbortSignal
    ): Promise<User> {
        return (
            await postJson<UserResponse, LoginMfaVerifyInput>(
                '/api/login/mfa/verify',
                input,
                signal
            )
        ).user;
    },

    resendLoginMfa(
        challengeId: string,
        signal?: AbortSignal
    ): Promise<{ download?: EmailDownload; mfaChallenge: LoginMfaChallenge }> {
        return postJson<
            { download?: EmailDownload; mfaChallenge: LoginMfaChallenge },
            { challengeId: string }
        >('/api/login/mfa/resend', { challengeId }, signal);
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

    async staffInvitation(token: string, signal?: AbortSignal): Promise<User> {
        return (
            await getJson<StaffInvitationDetails>(
                `/api/staff-invitation?token=${encodeURIComponent(token)}`,
                signal
            )
        ).user;
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

    async listSessions(signal?: AbortSignal): Promise<SessionInfo[]> {
        return (await getJson<SessionsResponse>('/api/me/sessions', signal))
            .items;
    },

    async listAdminSessions(signal?: AbortSignal): Promise<SessionInfo[]> {
        return (await getJson<SessionsResponse>('/api/admin/sessions', signal))
            .items;
    },

    revokeSession(
        sessionId: string,
        signal?: AbortSignal
    ): Promise<{ ok: boolean }> {
        return deleteJsonResponse<{ ok: boolean }>(
            `/api/me/sessions/${sessionId}`,
            signal
        );
    },

    revokeAdminSession(
        sessionId: string,
        signal?: AbortSignal
    ): Promise<{ ok: boolean }> {
        return deleteJsonResponse<{ ok: boolean }>(
            `/api/admin/sessions/${sessionId}`,
            signal
        );
    },

    logoutOtherSessions(signal?: AbortSignal): Promise<{ endedCount: number }> {
        return postJson<{ endedCount: number }>(
            '/api/me/sessions/logout-others',
            undefined,
            signal
        );
    },

    getMfaSettings(signal?: AbortSignal): Promise<UserMfaSettings> {
        return getJson<UserMfaSettings>('/api/me/mfa', signal);
    },

    updateMfaSettings(
        input: { emailEnabled: boolean },
        signal?: AbortSignal
    ): Promise<UserMfaSettings> {
        return patchJson<UserMfaSettings, { emailEnabled: boolean }>(
            '/api/me/mfa',
            input,
            signal
        );
    },

    inviteStaff(
        input: InviteStaffInput,
        signal?: AbortSignal
    ): Promise<VerificationResult> {
        return postJson<VerificationResult, InviteStaffInput>(
            '/api/admin/staff-invitations',
            input,
            signal
        );
    },

    async completeStaffInvitation(
        input: CompleteStaffInvitationInput,
        signal?: AbortSignal
    ): Promise<User> {
        return (
            await postJson<UserResponse, CompleteStaffInvitationInput>(
                '/api/staff-register',
                input,
                signal
            )
        ).user;
    },
};
