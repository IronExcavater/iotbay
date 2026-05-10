import { getJson } from '@shared/services/http';

export interface AccessLogEntry {
    deviceLabel: string;
    eventType: string;
    id: string;
    ipAddress?: string | null;
    occurredAt: string;
    sessionId: string;
    userAgent?: string | null;
    userEmail?: string | null;
    userFirstName?: string | null;
    userId: string;
    userLastName?: string | null;
    userName?: string | null;
    userProfileImageUrl?: string | null;
}

interface AccessLogsResponse {
    items: AccessLogEntry[];
}

export interface AccessLogQuery {
    eventType?: string;
    fromDate?: string;
    toDate?: string;
}

function queryString(query: AccessLogQuery = {}) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
        if (value) searchParams.set(key, value);
    }
    const value = searchParams.toString();
    return value ? `?${value}` : '';
}

export const accessLogsApi = {
    async listMine(
        query?: AccessLogQuery,
        signal?: AbortSignal
    ): Promise<AccessLogEntry[]> {
        return (
            await getJson<AccessLogsResponse>(
                `/api/access-logs${queryString(query)}`,
                signal
            )
        ).items;
    },

    async listAdmin(
        query?: AccessLogQuery,
        signal?: AbortSignal
    ): Promise<AccessLogEntry[]> {
        return (
            await getJson<AccessLogsResponse>(
                `/api/admin/access-logs${queryString(query)}`,
                signal
            )
        ).items;
    },
};
