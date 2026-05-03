import { useEffect, useState } from 'react';
import { FaArrowsRotate } from 'react-icons/fa6';
import { Link } from 'react-router-dom';

import { accessLogsApi, type AccessLogEntry } from '@features/access-logs/api';
import { toErrorMessage } from '@shared/services/http';
import { Button } from '@shared/ui/form/Button';
import { DatePicker } from '@shared/ui/form/DatePicker';
import { MenuSelect } from '@shared/ui/form/MenuSelect';
import { SearchInput } from '@shared/ui/form/SearchInput';
import {
    Table,
    TableHead,
    TableLoadingRow,
    TableMessageRow,
    TableSingleLineCell,
    TableStackCell,
} from '@shared/ui/table/Table';
import { DateTimeValue } from '@shared/value-objects/DateTimeValue';

const EVENT_TYPE_OPTIONS = [
    { label: 'All events', value: '' },
    { label: 'Login', value: 'login' },
    { label: 'Logout', value: 'logout' },
    { label: 'Session revoked', value: 'session_revoked' },
];

export function AccessLogsTable({ admin = false }: { admin?: boolean }) {
    const [logs, setLogs] = useState<AccessLogEntry[]>([]);
    const [eventType, setEventType] = useState('');
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
                const query = { eventType, fromDate, toDate };
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
    }, [admin, eventType, fromDate, toDate, refreshKey]);

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
                    <div className="w-40">
                        <MenuSelect
                            label="Filter logs by event"
                            labelHidden
                            onChange={setEventType}
                            options={EVENT_TYPE_OPTIONS}
                            placeholder="Event"
                            value={eventType}
                        />
                    </div>
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
                                <tr
                                    className="border-ui-200 border-t"
                                    key={log.id}
                                >
                                    {admin && (
                                        <td className="px-5 py-3">
                                            <TableStackCell>
                                                <Link
                                                    className="text-ui-900 text-sm font-medium hover:underline"
                                                    to={`/admin/users/${log.userId}`}
                                                >
                                                    {log.userName ??
                                                        log.userEmail}
                                                </Link>
                                                {log.userName && (
                                                    <span className="text-ui-500 truncate text-xs">
                                                        {log.userEmail}
                                                    </span>
                                                )}
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
                                            {DateTimeValue.format(
                                                log.occurredAt,
                                                'short'
                                            )}
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
                                </tr>
                            ))
                        )}
                    </tbody>
                </Table>
            </div>
        </section>
    );
}
