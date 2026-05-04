import { useEffect, useState } from 'react';
import { FaArrowsRotate } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';

import { accessLogsApi, type AccessLogEntry } from '@features/access-logs/api';
import { toErrorMessage } from '@shared/services/http';
import { Avatar } from '@shared/ui/Avatar';
import { Button } from '@shared/ui/form/Button';
import { DatePicker } from '@shared/ui/form/DatePicker';
import { SearchInput } from '@shared/ui/form/SearchInput';
import {
    Table,
    TableHead,
    TableLoadingRow,
    TableMessageRow,
    TablePrimaryActionRow,
    TableSingleLineCell,
    TableStackCell,
} from '@shared/ui/table/Table';
import { DateTimeValue } from '@shared/value-objects/DateTimeValue';

export function AccessLogsTable({ admin = false }: { admin?: boolean }) {
    const navigate = useNavigate();
    const [logs, setLogs] = useState<AccessLogEntry[]>([]);
    const [fromDate, setFromDate] = useState('');
    const [search, setSearch] = useState('');
    const [toDate, setToDate] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const abortController = new AbortController();

        async function loadLogs() {
            setIsLoading(true);
            try {
                const query = { eventType: '', fromDate, toDate };
                const nextLogs = admin
                    ? await accessLogsApi.listAdmin(
                          query,
                          abortController.signal
                      )
                    : await accessLogsApi.listMine(
                          query,
                          abortController.signal
                      );
                if (!abortController.signal.aborted) {
                    setLogs(nextLogs);
                    setError(null);
                }
            } catch (err) {
                if (!abortController.signal.aborted) {
                    setError(toErrorMessage(err, 'Unable to load access logs'));
                }
            } finally {
                if (!abortController.signal.aborted) setIsLoading(false);
            }
        }

        void loadLogs();
        return () => abortController.abort();
    }, [admin, fromDate, toDate, refreshKey]);

    const colCount = admin ? 5 : 4;
    const filteredLogs = logs.filter((log) => {
        const query = search.trim().toLowerCase();
        if (!query) return true;
        return [
            log.userName ?? '',
            log.userEmail ?? '',
            log.eventType,
            log.deviceLabel,
            log.ipAddress ?? '',
        ]
            .join(' ')
            .toLowerCase()
            .includes(query);
    });

    return (
        <section className="bg-ui-0 border-ui-200 overflow-hidden rounded border">
            <div className="border-ui-200 flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-ui-900 text-xl font-semibold">
                        Access logs
                    </h2>
                    <Button
                        aria-label="Refresh logs"
                        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full p-0"
                        onClick={() => setRefreshKey((k) => k + 1)}
                        type="button"
                        variant="ghost"
                    >
                        <FaArrowsRotate
                            aria-hidden="true"
                            className="size-3.5"
                        />
                    </Button>
                </div>

                <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-3">
                    <SearchInput
                        className="w-full sm:w-64"
                        onChange={setSearch}
                        placeholder="Search logs"
                        value={search}
                    />
                    <DatePicker
                        ariaLabel="Filter logs after date"
                        className="sm:w-36"
                        onChange={setFromDate}
                        placeholder="After date"
                        value={fromDate}
                    />
                    <DatePicker
                        ariaLabel="Filter logs before date"
                        className="sm:w-36"
                        onChange={setToDate}
                        placeholder="Before date"
                        value={toDate}
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <Table>
                    <colgroup>
                        {admin && <col className="w-[20%]" />}
                        <col className={admin ? 'w-[16%]' : 'w-[20%]'} />
                        <col className={admin ? 'w-[28%]' : 'w-[35%]'} />
                        <col className={admin ? 'w-[26%]' : 'w-[32%]'} />
                        <col className={admin ? 'w-[10%]' : 'w-[13%]'} />
                    </colgroup>
                    <TableHead>
                        <tr>
                            {admin && <th className="px-5 py-3">User</th>}
                            <th className="px-5 py-3">Event</th>
                            <th className="px-5 py-3">When</th>
                            <th className="px-5 py-3">Device</th>
                            <th className="px-5 py-3">IP</th>
                        </tr>
                    </TableHead>
                    <tbody>
                        {isLoading ? (
                            <>
                                <TableLoadingRow colSpan={colCount} />
                                <TableLoadingRow colSpan={colCount} />
                                <TableLoadingRow colSpan={colCount} />
                            </>
                        ) : error ? (
                            <TableMessageRow
                                colSpan={colCount}
                                message={error}
                                tone="error"
                            />
                        ) : filteredLogs.length === 0 ? (
                            <TableMessageRow
                                colSpan={colCount}
                                message="No access logs found."
                                tone="muted"
                            />
                        ) : (
                            filteredLogs.map((log) => (
                                <AccessLogRow
                                    admin={admin}
                                    key={log.id}
                                    log={log}
                                    onOpenUser={(userId) => {
                                        navigate(`/admin/users/${userId}`);
                                    }}
                                />
                            ))
                        )}
                    </tbody>
                </Table>
            </div>
        </section>
    );
}

function AccessLogRow({
    admin,
    log,
    onOpenUser,
}: {
    admin: boolean;
    log: AccessLogEntry;
    onOpenUser: (userId: string) => void;
}) {
    const cells = (
        <>
            {admin && (
                <td className="px-5 py-3">
                    <TableStackCell>
                        <div className="flex items-center gap-3">
                            <Avatar
                                imageUrl={log.userProfileImageUrl}
                                name={
                                    log.userName ??
                                    log.userEmail ??
                                    'Unknown user'
                                }
                                size="sm"
                            />
                            <div className="grid min-w-0 gap-1">
                                <span className="text-ui-900 truncate text-sm font-medium">
                                    {log.userName ?? log.userEmail}
                                </span>
                                {log.userName && (
                                    <span className="text-ui-500 truncate text-xs">
                                        {log.userEmail}
                                    </span>
                                )}
                            </div>
                        </div>
                    </TableStackCell>
                </td>
            )}
            <td className="px-5 py-3">
                <TableSingleLineCell className="capitalize">
                    {log.eventType.replace(/_/g, ' ')}
                </TableSingleLineCell>
            </td>
            <td className="px-5 py-3">
                <TableSingleLineCell className="text-ui-500">
                    {DateTimeValue.format(log.occurredAt, 'short')}
                </TableSingleLineCell>
            </td>
            <td className="px-5 py-3">
                <TableSingleLineCell className="text-ui-500">
                    {log.deviceLabel}
                </TableSingleLineCell>
            </td>
            <td className="px-5 py-3">
                <TableSingleLineCell className="text-ui-500 font-mono text-xs">
                    {log.ipAddress ?? '-'}
                </TableSingleLineCell>
            </td>
        </>
    );

    if (!admin) {
        return <tr className="border-ui-200 border-t">{cells}</tr>;
    }

    return (
        <TablePrimaryActionRow
            label={`Open ${log.userName ?? log.userEmail ?? 'user'}`}
            onAction={() => onOpenUser(log.userId)}
        >
            {cells}
        </TablePrimaryActionRow>
    );
}
