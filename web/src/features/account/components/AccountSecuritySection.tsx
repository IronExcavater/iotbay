import { useEffect, useState } from 'react';
import { FaArrowsRotate, FaArrowRightFromBracket } from 'react-icons/fa6';

import { AccessLogsTable } from '@features/access-logs/components/AccessLogsTable';
import {
    authApi,
    type SessionInfo,
    type UserMfaSettings,
} from '@features/auth/api';
import { useAuth } from '@features/auth/AuthProvider';
import { toErrorMessage } from '@shared/services/http';
import { Button } from '@shared/ui/form/Button';
import { Switch } from '@shared/ui/form/Switch';
import { ActionMenu } from '@shared/ui/overlay/ActionMenu';
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

export function AccountSecuritySection({
    readOnly = false,
}: {
    readOnly?: boolean;
}) {
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
                    toErrorMessage(error, 'Unable to load security settings')
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
        if (!mfaSettings || readOnly || isUpdating) return;
        setIsUpdating(true);
        try {
            const settings = await authApi.updateMfaSettings({
                emailEnabled: !mfaSettings.emailEnabled,
            });
            setMfaSettings(settings);
            showToast(
                settings.emailEnabled
                    ? 'Email MFA enabled'
                    : 'Email MFA disabled'
            );
        } catch (error) {
            showToast(toErrorMessage(error, 'Unable to update MFA'));
        } finally {
            setIsUpdating(false);
        }
    }

    async function revokeSession(session: SessionInfo) {
        if (readOnly) return;
        try {
            if (session.isCurrent) {
                await logout();
                return;
            }
            await authApi.revokeSession(session.id);
            const nextSessions = await authApi.listSessions();
            setSessions(nextSessions);
            showToast('Session revoked');
        } catch (error) {
            showToast(toErrorMessage(error, 'Unable to revoke session'));
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
                        <h2 className="text-ui-900 text-xl font-semibold">
                            Email MFA
                        </h2>
                        <p className="text-ui-500 text-sm">
                            Receive a one-time code by email when signing in.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-ui-500 text-sm">
                            {mfaSettings?.emailEnabled ? 'On' : 'Off'}
                        </span>
                        <Switch
                            checked={Boolean(mfaSettings?.emailEnabled)}
                            disabled={readOnly || !mfaSettings}
                            label="Email MFA"
                            onChange={() => {
                                void toggleMfa();
                            }}
                        />
                    </div>
                </div>
            </section>

            <section className="bg-ui-0 border-ui-200 overflow-hidden rounded border">
                <div className="border-ui-200 flex items-center justify-between gap-4 border-b px-5 py-4">
                    <div className="flex items-center gap-2">
                        <h2 className="text-ui-900 text-xl font-semibold">
                            Sessions
                        </h2>
                        <Button
                            aria-label="Refresh sessions"
                            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full p-0"
                            onClick={() => {
                                void loadSettings();
                            }}
                            type="button"
                            variant="ghost"
                        >
                            <FaArrowsRotate
                                aria-hidden="true"
                                className="size-3.5"
                            />
                        </Button>
                    </div>
                    <p className="text-ui-500 shrink-0 text-sm">
                        Devices currently signed in to this account
                    </p>
                </div>
                <div className="overflow-x-auto">
                    <Table>
                        <colgroup>
                            <col className="w-[36%]" />
                            <col className="w-[24%]" />
                            <col className="w-[22%]" />
                            <col className="w-[10%]" />
                            <col className="w-[8%]" />
                        </colgroup>
                        <TableHead>
                            <tr>
                                <th className="px-5 py-3">Device</th>
                                <th className="px-5 py-3">Last seen</th>
                                <th className="px-5 py-3">IP</th>
                                <th className="px-5 py-3">Type</th>
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
                                                {session.isCurrent && (
                                                    <span className="text-ui-500 ml-1.5 font-normal">
                                                        (current)
                                                    </span>
                                                )}
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
                                                {session.latestIpAddress ?? '-'}
                                            </TableSingleLineCell>
                                        </td>
                                        <td className="px-5 py-3">
                                            <TableSingleLineCell className="text-ui-500">
                                                {session.isTrusted
                                                    ? 'Trusted'
                                                    : 'Standard'}
                                            </TableSingleLineCell>
                                        </td>
                                        <TableActionCell>
                                            {!readOnly && (
                                                <ActionMenu
                                                    items={[
                                                        {
                                                            icon: FaArrowRightFromBracket,
                                                            label: session.isCurrent
                                                                ? 'Sign out'
                                                                : 'Revoke',
                                                            onSelect: () => {
                                                                void revokeSession(
                                                                    session
                                                                );
                                                            },
                                                            tone: session.isCurrent
                                                                ? 'danger'
                                                                : 'default',
                                                        },
                                                    ]}
                                                    label={`Open session actions for ${session.deviceLabel}`}
                                                />
                                            )}
                                        </TableActionCell>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </div>
            </section>

            <AccessLogsTable />
        </section>
    );
}
