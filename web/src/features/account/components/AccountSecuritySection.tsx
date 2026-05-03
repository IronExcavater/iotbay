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
import {
    Table,
    TableActionCell,
    TableHead,
    TableLoadingRow,
    TableMessageRow,
    TableSingleLineCell,
} from '@shared/ui/table/Table';
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
                <div className="bg-ui-0 border-ui-200 overflow-hidden rounded border">
                    <div className="overflow-x-auto">
                        <Table>
                            <colgroup>
                                <col className="w-[34%]" />
                                <col className="w-[24%]" />
                                <col className="w-[22%]" />
                                <col className="w-[12%]" />
                                <col className="w-[8%]" />
                            </colgroup>
                            <TableHead>
                                <tr>
                                    <th className="px-5 py-3">Device</th>
                                    <th className="px-5 py-3">Last seen</th>
                                    <th className="px-5 py-3">IP</th>
                                    <th className="px-5 py-3">Trust</th>
                                    <th className="px-2 py-3 text-right">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </TableHead>
                            <tbody>
                                {isLoadingSettings ? (
                                    <>
                                        <TableLoadingRow colSpan={5} />
                                        <TableLoadingRow colSpan={5} />
                                    </>
                                ) : sessions.length === 0 ? (
                                    <TableMessageRow
                                        colSpan={5}
                                        message="No active sessions."
                                        tone="muted"
                                    />
                                ) : (
                                    sessions.map((session) => (
                                        <tr
                                            className="border-ui-200 border-t align-top"
                                            key={session.id}
                                        >
                                            <td className="px-5 py-3">
                                                <TableSingleLineCell className="text-ui-900 font-medium">
                                                    {session.deviceLabel}
                                                    {session.isCurrent
                                                        ? ' (current)'
                                                        : ''}
                                                </TableSingleLineCell>
                                            </td>
                                            <td className="px-5 py-3">
                                                <TableSingleLineCell className="text-ui-500">
                                                    {DateTimeValue.format(
                                                        session.lastSeenAt,
                                                        'relative'
                                                    )}
                                                </TableSingleLineCell>
                                            </td>
                                            <td className="px-5 py-3">
                                                <TableSingleLineCell className="text-ui-500 font-mono text-xs">
                                                    {session.latestIpAddress ??
                                                        '-'}
                                                </TableSingleLineCell>
                                            </td>
                                            <td className="px-5 py-3">
                                                <TableSingleLineCell className="text-ui-500">
                                                    {session.isTrusted
                                                        ? 'Trusted'
                                                        : 'Session'}
                                                </TableSingleLineCell>
                                            </td>
                                            <TableActionCell>
                                                <Button
                                                    className="h-8 px-2"
                                                    onClick={() => {
                                                        void revokeSession(
                                                            session
                                                        );
                                                    }}
                                                    type="button"
                                                    variant={
                                                        session.isCurrent
                                                            ? 'danger'
                                                            : 'secondary'
                                                    }
                                                >
                                                    {session.isCurrent
                                                        ? 'Sign out'
                                                        : 'Revoke'}
                                                </Button>
                                            </TableActionCell>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </Table>
                    </div>
                </div>
            </section>

            <AccessLogsTable />
        </section>
    );
}
