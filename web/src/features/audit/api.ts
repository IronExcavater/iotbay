import { getJson, postJson } from '@shared/services/http';

export interface AuditEvent {
    action: string;
    actorEmail?: string | null;
    actorName?: string | null;
    actorUserId?: string | null;
    diff?: Record<string, { after: unknown; before: unknown }> | null;
    entityId: string;
    entityType: string;
    id: string;
    occurredAt: string;
    origin: 'direct' | 'redo' | 'undo';
    sourceAuditEventId?: string | null;
}

export const auditApi = {
    async getEntityTimeline(
        entityType: string,
        entityId: string,
        signal?: AbortSignal
    ): Promise<AuditEvent[]> {
        return (
            await getJson<{ events: AuditEvent[] }>(
                `/api/audit/entities/${entityType}/${entityId}`,
                signal
            )
        ).events;
    },

    async undoEvent(
        auditEventId: string,
        signal?: AbortSignal
    ): Promise<AuditEvent> {
        return (
            await postJson<{ event: AuditEvent }>(
                `/api/audit/events/${auditEventId}/undo`,
                undefined,
                signal
            )
        ).event;
    },

    async redoEvent(
        auditEventId: string,
        signal?: AbortSignal
    ): Promise<AuditEvent> {
        return (
            await postJson<{ event: AuditEvent }>(
                `/api/audit/events/${auditEventId}/redo`,
                undefined,
                signal
            )
        ).event;
    },
};
