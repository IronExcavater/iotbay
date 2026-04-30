import { useEffect, useState } from 'react';

import { accessLogsApi, type AccessLogEntry } from '@features/access-logs/api';
import { toErrorMessage } from '@shared/services/http';
import { Input } from '@shared/ui/form/Input';
import { DateTimeValue } from '@shared/value-objects/DateTimeValue';

export default function AdminAccessLogsPage() {
    const [logs, setLogs] = useState<AccessLogEntry[]>([]);
    const [eventType, setEventType] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [pageError, setPageError] = useState<string | null>(null);

    useEffect(() => {
        const abortController = new AbortController();

        async function loadLogs() {
            setIsLoading(true);
            try {
                const items = await accessLogsApi.listAdmin(
                    {
                        eventType,
                        fromDate,
                        toDate,
                    },
                    abortController.signal
                );
                if (!abortController.signal.aborted) {
                    setLogs(items);
                    setPageError(null);
                }
            } catch (error) {
                if (!abortController.signal.aborted) {
                    setPageError(
                        toErrorMessage(error, 'Unable to load access logs')
                    );
                }
            } finally {
                if (!abortController.signal.aborted) setIsLoading(false);
            }
        }

        void loadLogs();
        return () => abortController.abort();
    }, [eventType, fromDate, toDate]);

    return (
        <section className="grid gap-5">
            <div>
                <h1 className="text-3xl font-semibold tracking-tight">
                    Access logs
                </h1>
                <p className="text-ui-500 mt-1 text-sm">
                    Read-only login, logout, and session revocation records.
                </p>
            </div>

            <div className="bg-ui-0 border-ui-200 rounded border p-4">
                <div className="grid gap-3 sm:grid-cols-3">
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
            </div>

            {pageError && <p className="text-sm text-red-700">{pageError}</p>}

            <div className="bg-ui-0 border-ui-200 overflow-x-auto rounded border">
                <table className="w-full text-left text-sm">
                    <thead className="bg-ui-100 text-ui-600 border-ui-200 border-b">
                        <tr>
                            <th className="px-4 py-3">User</th>
                            <th className="px-4 py-3">Event</th>
                            <th className="px-4 py-3">When</th>
                            <th className="px-4 py-3">Device</th>
                            <th className="px-4 py-3">IP</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log) => (
                            <tr className="border-ui-200 border-b" key={log.id}>
                                <td className="px-4 py-3">
                                    {log.userName ?? log.userEmail}
                                </td>
                                <td className="px-4 py-3">{log.eventType}</td>
                                <td className="px-4 py-3">
                                    {DateTimeValue.format(
                                        log.occurredAt,
                                        'long'
                                    )}
                                </td>
                                <td className="px-4 py-3">{log.deviceLabel}</td>
                                <td className="px-4 py-3">
                                    {log.ipAddress ?? '-'}
                                </td>
                            </tr>
                        ))}
                        {!isLoading && logs.length === 0 && (
                            <tr>
                                <td
                                    className="text-ui-500 px-4 py-5"
                                    colSpan={5}
                                >
                                    No access logs found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
