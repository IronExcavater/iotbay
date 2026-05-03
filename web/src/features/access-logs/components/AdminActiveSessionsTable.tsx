import { useEffect, useState } from 'react';
import { FaArrowsRotate, FaArrowRightFromBracket } from 'react-icons/fa6';
import { Link } from 'react-router-dom';

import { authApi, type SessionInfo } from '@features/auth/api';
import { toErrorMessage } from '@shared/services/http';
import { Button } from '@shared/ui/form/Button';
import { ActionMenu } from '@shared/ui/overlay/ActionMenu';
import {
    Table,
    TableActionCell,
    TableHead,
    TableLoadingRow,
    TableMessageRow,
    TableSingleLineCell,
    TableStackCell,
} from '@shared/ui/table/Table';
import { useToast } from '@shared/ui/toast/ToastProvider';
import { DateTimeValue } from '@shared/value-objects/DateTimeValue';

export function AdminActiveSessionsTable() {
    const { showToast } = useToast();
    const [sessions, setSessions] = useState<SessionInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [revokingSessionId, setRevokingSessionId] = useState<string | null>(
        null
    );
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const abortController = new AbortController();

        async function loadSessions() {
            setIsLoading(true);
            try {
                const nextSessions = await authApi.listAdminSessions(
                    abortController.signal
                );
                if (!abortController.signal.aborted) {
                    setSessions(nextSessions);
                    setError(null);
                }
            } catch (caughtError) {
                if (!abortController.signal.aborted) {
                    setError(
                        toErrorMessage(
                            caughtError,
                            'Unable to load active sessions'
                        )
                    );
                }
            } finally {
                if (!abortController.signal.aborted) setIsLoading(false);
            }
        }

        void loadSessions();
        return () => abortController.abort();
    }, [refreshKey]);

    async function revokeSession(session: SessionInfo) {
        setRevokingSessionId(session.id);
        try {
            await authApi.revokeAdminSession(session.id);
            setSessions((current) =>
                current.filter((item) => item.id !== session.id)
            );
            showToast('Session revoked');
        } catch (caughtError) {
            showToast(toErrorMessage(caughtError, 'Unable to revoke session'));
        } finally {
            setRevokingSessionId(null);
        }
    }

    return (
        <section className="bg-ui-0 border-ui-200 overflow-hidden rounded border">
            <div className="border-ui-200 flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-ui-900 text-xl font-semibold">
                        Active sessions
                    </h2>
                    <Button
                        aria-label="Refresh active sessions"
                        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full p-0"
                        onClick={() => setRefreshKey((key) => key + 1)}
                        type="button"
                        variant="ghost"
                    >
                        <FaArrowsRotate
                            aria-hidden="true"
                            className="size-3.5"
                        />
                    </Button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <Table>
                    <colgroup>
                        <col className="w-[26%]" />
                        <col className="w-[22%]" />
                        <col className="w-[18%]" />
                        <col className="w-[20%]" />
                        <col className="w-[8%]" />
                        <col className="w-[6%]" />
                    </colgroup>
                    <TableHead>
                        <tr>
                            <th className="px-5 py-3">User</th>
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
                        {isLoading ? (
                            <>
                                <TableLoadingRow colSpan={6} />
                                <TableLoadingRow colSpan={6} />
                            </>
                        ) : error ? (
                            <TableMessageRow
                                colSpan={6}
                                message={error}
                                tone="error"
                            />
                        ) : sessions.length === 0 ? (
                            <TableMessageRow
                                colSpan={6}
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
                                        <TableStackCell>
                                            {session.userId ? (
                                                <Link
                                                    className="text-ui-900 font-medium hover:underline"
                                                    to={`/admin/users/${session.userId}`}
                                                >
                                                    {session.userName ??
                                                        session.userEmail ??
                                                        'Unknown user'}
                                                </Link>
                                            ) : (
                                                <span className="text-ui-900 font-medium">
                                                    {session.userName ??
                                                        session.userEmail ??
                                                        'Unknown user'}
                                                </span>
                                            )}
                                            {session.userEmail && (
                                                <span className="text-ui-500 truncate text-xs">
                                                    {session.userEmail}
                                                </span>
                                            )}
                                        </TableStackCell>
                                    </td>
                                    <td className="px-5 py-3">
                                        <TableSingleLineCell className="text-ui-500">
                                            {session.deviceLabel}
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
                                                : 'Session'}
                                        </TableSingleLineCell>
                                    </td>
                                    <TableActionCell>
                                        <ActionMenu
                                            items={[
                                                {
                                                    disabled:
                                                        session.isCurrent ||
                                                        revokingSessionId ===
                                                            session.id,
                                                    icon: FaArrowRightFromBracket,
                                                    label: 'Revoke',
                                                    onSelect: () => {
                                                        void revokeSession(
                                                            session
                                                        );
                                                    },
                                                },
                                            ]}
                                            label={`Open session actions for ${session.deviceLabel}`}
                                        />
                                    </TableActionCell>
                                </tr>
                            ))
                        )}
                    </tbody>
                </Table>
            </div>
        </section>
    );
}
