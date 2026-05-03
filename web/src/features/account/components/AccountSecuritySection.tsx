import { useEffect, useState } from 'react';

import { AccessLogsTable } from '@features/access-logs/components/AccessLogsTable';
import {
    authApi,
    type SessionInfo,
    type UserMfaSettings,
} from '@features/auth/api';
import { useAuth } from '@features/auth/AuthProvider';
import { toErrorMessage } from '@shared/services/http';
import { Button } from '@shared/ui/form/Button';
import { useToast } from '@shared/ui/toast/ToastProvider';
import { DateTimeValue } from '@shared/value-objects/DateTimeValue';

export function AccountSecuritySection() {
    const { logout } = useAuth();
    const { showToast } = useToast();

    const [sessions, setSessions] = useState<SessionInfo[]>([]);
    const [mfaSettings, setMfaSettings] = useState<UserMfaSettings | null>(
        null
    );
    const [isLoadingSettings, setIsLoadingSettings] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [settingsError, setSettingsError] = useState<string | null>(null);

    async function loadSettings(signal?: AbortSignal) {
        setIsLoadingSettings(true);
        try {
            const [nextSettings, nextSessions] = await Promise.all([
                authApi.getMfaSettings(signal),
                authApi.listSessions(signal),
            ]);
            if (!signal?.aborted) {
                setMfaSettings(nextSettings);
                setSessions(nextSessions);
                setSettingsError(null);
            }
        } catch (error) {
            if (!signal?.aborted) {
                setSettingsError(
                    toErrorMessage(error, 'Unable to load security data')
                );
            }
        } finally {
            if (!signal?.aborted) setIsLoadingSettings(false);
        }
    }

    useEffect(() => {
        const abortController = new AbortController();
        void loadSettings(abortController.signal);
        return () => abortController.abort();
    }, []);

    async function toggleMfa() {
        if (!mfaSettings) return;
        setIsUpdating(true);
        try {
            const settings = await authApi.updateMfaSettings({
                emailEnabled: !mfaSettings.emailEnabled,
            });
            setMfaSettings(settings);
            showToast(
                settings.emailEnabled
                    ? 'Email MFA turned on'
                    : 'Email MFA turned off'
            );
        } catch (error) {
            showToast(toErrorMessage(error, 'Unable to update MFA'));
        } finally {
            setIsUpdating(false);
        }
    }

    async function revokeSession(session: SessionInfo) {
        try {
            if (session.isCurrent) {
                await logout();
                return;
            }
            await authApi.revokeSession(session.id);
            const nextSessions = await authApi.listSessions();
            setSessions(nextSessions);
            showToast('Session signed out');
        } catch (error) {
            showToast(toErrorMessage(error, 'Unable to sign out session'));
        }
    }

    async function logoutOthers() {
        setIsUpdating(true);
        try {
            const result = await authApi.logoutOtherSessions();
            const nextSessions = await authApi.listSessions();
            setSessions(nextSessions);
            showToast(`${result.endedCount} session(s) signed out`);
        } catch (error) {
            showToast(
                toErrorMessage(error, 'Unable to sign out other sessions')
            );
        } finally {
            setIsUpdating(false);
        }
    }

    return (
        <section className="grid gap-6">
            {settingsError && (
                <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {settingsError}
                </div>
            )}

            <section className="grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="text-ui-900 text-lg font-semibold">
                            Email MFA
                        </h2>
                        <p className="text-ui-500 text-sm">
                            Require a one-time email code during sign in.
                        </p>
                    </div>
                    <Button
                        disabled={isUpdating || !mfaSettings}
                        loading={isUpdating}
                        onClick={() => {
                            void toggleMfa();
                        }}
                        type="button"
                        variant="secondary"
                    >
                        {mfaSettings?.emailEnabled ? 'Turn off' : 'Turn on'}
                    </Button>
                </div>
            </section>

            <section className="grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="text-ui-900 text-lg font-semibold">
                            Sessions
                        </h2>
                        <p className="text-ui-500 text-sm">
                            Devices currently signed in to this account.
                        </p>
                    </div>
                    <Button
                        disabled={isUpdating}
                        onClick={() => {
                            void logoutOthers();
                        }}
                        type="button"
                        variant="secondary"
                    >
                        Sign out others
                    </Button>
                </div>
                <div className="divide-ui-200 divide-y">
                    {isLoadingSettings && (
                        <p className="text-ui-500 py-3 text-sm">Loading...</p>
                    )}
                    {!isLoadingSettings &&
                        sessions.map((session) => (
                            <div
                                className="flex flex-wrap items-center justify-between gap-3 py-3"
                                key={session.id}
                            >
                                <div className="grid gap-1">
                                    <strong className="text-ui-900 text-sm">
                                        {session.deviceLabel}
                                    </strong>
                                    <span className="text-ui-500 text-sm">
                                        Last seen{' '}
                                        {DateTimeValue.format(
                                            session.lastSeenAt,
                                            'relative'
                                        )}
                                        {session.isCurrent ? ' - current' : ''}
                                    </span>
                                </div>
                                <Button
                                    onClick={() => {
                                        void revokeSession(session);
                                    }}
                                    type="button"
                                    variant={
                                        session.isCurrent
                                            ? 'danger'
                                            : 'secondary'
                                    }
                                >
                                    {session.isCurrent ? 'Sign out' : 'Revoke'}
                                </Button>
                            </div>
                        ))}
                </div>
            </section>

            <AccessLogsTable />
        </section>
    );
}
