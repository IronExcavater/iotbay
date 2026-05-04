import { useState } from 'react';

import { auditApi, type AuditEvent } from '@features/audit/api';

interface UseEntityAuditOptions {
    entityId: string;
    entityType: string;
}

export function useEntityAudit({
    entityId,
    entityType,
}: UseEntityAuditOptions) {
    const [events, setEvents] = useState<AuditEvent[]>([]);

    async function loadEvents(signal?: AbortSignal) {
        if (!entityId) {
            setEvents([]);
            return;
        }
        setEvents(
            await auditApi.getEntityTimeline(entityType, entityId, signal)
        );
    }

    return {
        events,
        loadEvents,
        setEvents,
    };
}
