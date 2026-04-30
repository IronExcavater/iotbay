import { useState } from 'react';

import { auditApi, type AuditEvent } from '@features/audit/api';
import { toErrorMessage } from '@shared/services/http';

interface UseEntityAuditOptions {
    entityId: string;
    entityType: string;
    onAfterReplay: () => Promise<void>;
    showToast: (message: string) => void;
}

export function useEntityAudit({
    entityId,
    entityType,
    onAfterReplay,
    showToast,
}: UseEntityAuditOptions) {
    const [events, setEvents] = useState<AuditEvent[]>([]);
    const [pendingEventId, setPendingEventId] = useState<string | null>(null);

    async function loadEvents(signal?: AbortSignal) {
        if (!entityId) {
            setEvents([]);
            return;
        }
        setEvents(
            await auditApi.getEntityTimeline(entityType, entityId, signal)
        );
    }

    async function replay(event: AuditEvent, mode: 'redo' | 'undo') {
        setPendingEventId(event.id);
        try {
            if (mode === 'undo') {
                await auditApi.undoEvent(event.id);
            } else {
                await auditApi.redoEvent(event.id);
            }
            await onAfterReplay();
            showToast(mode === 'undo' ? 'Change undone' : 'Change redone');
        } catch (error) {
            showToast(toErrorMessage(error, 'Unable to replay change'));
        } finally {
            setPendingEventId(null);
        }
    }

    return {
        events,
        loadEvents,
        pendingEventId,
        replay,
        setEvents,
    };
}
