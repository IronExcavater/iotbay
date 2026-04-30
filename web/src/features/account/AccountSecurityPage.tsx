import { useEffect, useState } from 'react';

import { accessLogsApi, type AccessLogEntry } from '@features/access-logs/api';
import {
    authApi,
    type SessionInfo,
    type UserMfaSettings,
} from '@features/auth/api';
import { useAuth } from '@features/auth/AuthProvider';
import { toErrorMessage } from '@shared/services/http';
import { Button } from '@shared/ui/form/Button';
import { Input } from '@shared/ui/form/Input';
import { useToast } from '@shared/ui/toast/ToastProvider';
import { DateTimeValue } from '@shared/value-objects/DateTimeValue';

export default function AccountSecurityPage() {
    const { logout } = useAuth();
    const { showToast } = useToast();
    const [logs, setLogs] = useState<AccessLogEntry[]>([]);
    const [sessions, setSessions] = useState<SessionInfo[]>([]);
    const [mfaSettings, setMfaSettings] = useState<UserMfaSettings | null>(
        null
    );
    const [eventType, setEventType] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [pageError, setPageError] = useState<string | null>(null);

    async function loadSecurity(signal?: AbortSignal) {
        setIsLoading(true);
        try {
            const [nextSettings, nextSessions, nextLogs] = await Promise.all([
                authApi.getMfaSettings(signal),
                authApi.listSessions(signal),
                accessLogsApi.listMine(
                    {
                        eventType,
                        fromDate,
                        toDate,
                    },
                    signal
                ),
            ]);
            if (!signal?.aborted) {
                setMfaSettings(nextSettings);
                setSessions(nextSessions);
                setLogs(nextLogs);
                setPageError(null);
            }
        } catch (error) {
            if (!signal?.aborted) {
                setPageError(
                    toErrorMessage(error, 'Unable to load security data')
                );
            }
        } finally {
            if (!signal?.aborted) setIsLoading(false);
        }
    }

    useEffect(() => {
        const abortController = new AbortController();
        void loadSecurity(abortController.signal);
        return () => abortController.abort();
    }, [eventType, fromDate, toDate]);

    async function toggleMfa() {
        if (!mfaSettings) return;

        setIsUpdating(true);
        try {
            const settings = await authApi.updateMfaSettings({
                emailEnabled: !mfaSettings.emailEnabled,
            });
            setMfaSettings(settings);
            showToast(settings.emailEnabled ? 'MFA enabled' : 'MFA disabled');
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
            await loadSecurity();
            showToast('Session signed out');
        } catch (error) {
            showToast(toErrorMessage(error, 'Unable to sign out session'));
        }
    }

    async function logoutOthers() {
        setIsUpdating(true);
        try {
            const result = await authApi.logoutOtherSessions();
            await loadSecurity();
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
        <section className="mx-auto grid max-w-5xl gap-6">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Account security
            </h1>

            {pageError && (
                <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {pageError}
                </div>
            )}

            <section className="bg-ui-0 border-ui-200 rounded border p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold">Email MFA</h2>
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
                        {mfaSettings?.emailEnabled
                            ? 'Disable MFA'
                            : 'Enable MFA'}
                    </Button>
                </div>
            </section>

            <section className="bg-ui-0 border-ui-200 rounded border p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h2 className="text-lg font-semibold">Active sessions</h2>
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
                <div className="mt-4 grid gap-3">
                    {isLoading && (
                        <p className="text-ui-500 text-sm">Loading...</p>
                    )}
                    {!isLoading &&
                        sessions.map((session) => (
                            <div
                                className="border-ui-200 flex flex-wrap items-center justify-between gap-3 rounded border p-3"
                                key={session.id}
                            >
                                <div className="grid gap-1">
                                    <strong>{session.deviceLabel}</strong>
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

            <section className="bg-ui-0 border-ui-200 rounded border p-5">
                <h2 className="text-lg font-semibold">Access logs</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <Input
                        onChange={(event) => setFromDate(event.target.value)}
                        type="date"
                        value={fromDate}
                    />
                    <Input
                        onChange={(event) => setToDate(event.target.value)}
                        type="date"
                        value={toDate}
                    />
                    <select
                        className="bg-ui-0 ring-ui-300 h-10 rounded px-3 text-sm ring-1"
                        onChange={(event) => setEventType(event.target.value)}
                        value={eventType}
                    >
                        <option value="">All events</option>
                        <option value="login">Login</option>
                        <option value="logout">Logout</option>
                        <option value="session_revoked">Session revoked</option>
                    </select>
                </div>
                <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-ui-500 border-ui-200 border-b">
                            <tr>
                                <th className="py-2">Event</th>
                                <th className="py-2">When</th>
                                <th className="py-2">Device</th>
                                <th className="py-2">IP</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log) => (
                                <tr
                                    className="border-ui-200 border-b"
                                    key={log.id}
                                >
                                    <td className="py-2">{log.eventType}</td>
                                    <td className="py-2">
                                        {DateTimeValue.format(
                                            log.occurredAt,
                                            'long'
                                        )}
                                    </td>
                                    <td className="py-2">{log.deviceLabel}</td>
                                    <td className="py-2">
                                        {log.ipAddress ?? '-'}
                                    </td>
                                </tr>
                            ))}
                            {!isLoading && logs.length === 0 && (
                                <tr>
                                    <td
                                        className="text-ui-500 py-4"
                                        colSpan={4}
                                    >
                                        No access logs found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </section>
    );
}
