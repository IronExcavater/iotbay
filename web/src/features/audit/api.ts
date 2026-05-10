import { getJson } from '@shared/services/http';

export interface AuditEvent {
    action: string;
    actorEmail?: string | null;
    actorFirstName?: string | null;
    actorLastName?: string | null;
    actorName?: string | null;
    actorProfileImageUrl?: string | null;
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
};
