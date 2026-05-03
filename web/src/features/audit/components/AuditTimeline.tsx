import type { AuditEvent } from '@features/audit/api';
import { DateTimeValue } from '@shared/value-objects/DateTimeValue';

interface AuditTimelineProps {
    events: AuditEvent[];
    isLoading?: boolean;
}

interface EventSummary {
    detail?: string;
    title: string;
}

export function AuditTimeline({
    events,
    isLoading = false,
}: AuditTimelineProps) {
    const grouped = isLoading ? events : groupNearbyEvents(events);

    return (
        <section className="grid gap-4">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-ui-900 text-xl font-semibold">Activity</h2>
                {!isLoading && grouped.length > 0 && (
                    <span className="text-ui-500 text-xs">
                        {grouped.length} event{grouped.length === 1 ? '' : 's'}
                    </span>
                )}
            </div>

            {isLoading ? (
                <p className="text-ui-500 text-sm">Loading activity...</p>
            ) : grouped.length === 0 ? (
                <p className="text-ui-500 text-sm">No activity yet.</p>
            ) : (
                <ol className="grid gap-0">
                    {grouped.map((event, index) => {
                        const summary = formatEventSummary(event);

                        return (
                            <li
                                className="grid grid-cols-[1rem_minmax(0,1fr)] gap-3"
                                key={event.id}
                            >
                                <div className="relative flex justify-center">
                                    <span
                                        aria-hidden="true"
                                        className="bg-ui-0 ring-ui-300 relative z-10 mt-1.5 size-3 shrink-0 rounded-full ring-2"
                                    />
                                    {index < grouped.length - 1 && (
                                        <span
                                            aria-hidden="true"
                                            className="bg-ui-200 absolute top-4 -bottom-1.5 left-1/2 w-0.5 -translate-x-1/2"
                                        />
                                    )}
                                </div>

                                <div
                                    className={
                                        index < events.length - 1
                                            ? 'min-w-0 pb-5'
                                            : 'min-w-0'
                                    }
                                >
                                    <div className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4">
                                        <div className="min-w-0">
                                            <p className="text-ui-900 truncate text-sm font-medium">
                                                {summary.title}
                                            </p>
                                            {summary.detail && (
                                                <p className="text-ui-500 mt-0.5 truncate text-sm">
                                                    {summary.detail}
                                                </p>
                                            )}
                                        </div>
                                        <p className="text-ui-500 text-xs sm:pt-0.5 sm:text-right">
                                            {formatActor(event)} -{' '}
                                            {DateTimeValue.format(
                                                event.occurredAt,
                                                'short'
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ol>
            )}
        </section>
    );
}

function formatActor(event: AuditEvent) {
    return event.actorName || event.actorEmail || 'System';
}

function formatEventSummary(event: AuditEvent): EventSummary {
    const diff = event.diff;

    if (isCreatedAction(event.action)) {
        return {
            detail: formatCreatedDetail(event),
            title: `Created ${entityNameFromDiff(event)}`,
        };
    }

    if (event.action === 'mfa_settings_updated' && diff?.emailEnabled) {
        return {
            title: enabledValue(diff.emailEnabled.after)
                ? 'Turned on email MFA'
                : 'Turned off email MFA',
            detail: 'Account sign-in protection',
        };
    }

    if (isVerifiedAction(event.action)) {
        return {
            detail: 'Email verification completed',
            title: `Verified ${verifiedTarget(event)}`,
        };
    }

    if (!diff || Object.keys(diff).length === 0) {
        return { title: formatActionLabel(event.action) };
    }

    const entries = Object.entries(diff);
    if (entries.length === 1) {
        const [field, { before, after }] = entries[0];
        const label = fieldLabel(field);

        if (isBinaryValue(before) || isBinaryValue(after)) {
            return {
                title: `${enabledValue(after) ? 'Turned on' : 'Turned off'} ${label}`,
            };
        }

        return {
            title: valuePresent(after)
                ? `Updated ${label}`
                : `Cleared ${label}`,
            detail: valuePresent(after)
                ? `Set to ${formatValue(after)}`
                : undefined,
        };
    }

    const labels = entries.map(([field]) => fieldLabel(field));
    return {
        title:
            event.action === 'status_changed'
                ? `Set status to ${formatValue(diff.status?.after)}`
                : formatGroupedTitle(event.action, labels),
        detail: formatGroupedDetail(entries),
    };
}

function formatCreatedDetail(event: AuditEvent): string | undefined {
    const diff = event.diff ?? {};

    if (event.entityType === 'product') {
        const price =
            diff.priceCents?.after != null
                ? `$${(Number(diff.priceCents.after) / 100).toFixed(2)}`
                : undefined;
        const parts = [diff.name?.after, price]
            .filter(valuePresent)
            .map(String);
        return parts.length > 0 ? parts.join(' · ') : 'Catalogue item';
    }

    const parts = [diff.email?.after, diff.phoneNumber?.after]
        .filter(valuePresent)
        .map(String);
    return parts.length > 0 ? parts.join(' · ') : undefined;
}

function entityNameFromDiff(event: AuditEvent): string {
    const diff = event.diff ?? {};
    const fullName = [diff.firstName?.after, diff.lastName?.after]
        .filter(valuePresent)
        .join(' ');

    return formatValue(
        fullName || diff.name?.after || diff.email?.after || event.entityType
    );
}

function verifiedTarget(event: AuditEvent): string {
    const diff = event.diff ?? {};
    return formatValue(diff.email?.after || diff.email?.before || 'email');
}

function formatActionLabel(action: string): string {
    const parts = action.split('_');
    const verb = parts[parts.length - 1];
    const entity = parts.slice(0, -1).join(' ');

    const verbMap: Record<string, string> = {
        created: 'Created',
        deleted: 'Deleted',
        disabled: 'Disabled',
        enabled: 'Enabled',
        sent: 'Sent',
        updated: 'Updated',
        verified: 'Verified',
        revoked: 'Revoked',
    };

    const formattedVerb = verbMap[verb] ?? humanize(verb);
    return entity ? `${formattedVerb} ${humanize(entity)}` : formattedVerb;
}

function fieldLabel(field: string) {
    const labels: Record<string, string> = {
        emailEnabled: 'email MFA',
        firstName: 'first name',
        lastName: 'last name',
        mediaUrls: 'images',
        mfaVerifiedAt: 'MFA verification',
        phoneNumber: 'phone number',
        priceCents: 'price',
        userType: 'user type',
    };

    return labels[field] ?? humanize(field).toLowerCase();
}

function joinLabels(labels: string[]) {
    if (labels.length <= 2) return labels.join(' and ');
    return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

function formatGroupedTitle(action: string, labels: string[]) {
    if (action === 'updated') {
        return `Updated ${joinLabels(labels)}`;
    }
    if (action === 'profile_updated') {
        return `Updated profile`;
    }
    if (action === 'managed_user_updated') {
        return `Updated account`;
    }
    return formatActionLabel(action);
}

function formatGroupedDetail(
    entries: Array<[string, { after: unknown; before: unknown }]>
) {
    const changed = entries
        .slice(0, 4)
        .map(
            ([field, { after }]) =>
                `${fieldLabel(field)}: ${formatValue(after)}`
        );
    const overflow =
        entries.length > changed.length
            ? ` +${entries.length - changed.length} more`
            : '';
    return `${changed.join(', ')}${overflow}`;
}

function formatValue(value: unknown): string {
    if (!valuePresent(value)) return 'empty';
    const text = String(value).trim();
    if (text === 'true' || text === '1') return 'on';
    if (text === 'false' || text === '0') return 'off';
    if (text.length <= 72) return text;
    return `${text.substring(0, 72)}...`;
}

function enabledValue(value: unknown) {
    return value === true || value === 1 || value === '1' || value === 'true';
}

function isBinaryValue(value: unknown) {
    return (
        typeof value === 'boolean' ||
        value === 0 ||
        value === 1 ||
        value === '0' ||
        value === '1' ||
        value === 'true' ||
        value === 'false'
    );
}

function isCreatedAction(action: string) {
    return action === 'created' || action.endsWith('_created');
}

function isVerifiedAction(action: string) {
    return action === 'email_verified' || action.endsWith('_verified');
}

function valuePresent(value: unknown) {
    return value !== null && value !== undefined && String(value).trim() !== '';
}

function humanize(value: string) {
    return value
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isGroupableAction(action: string) {
    return (
        action === 'updated' ||
        action === 'profile_updated' ||
        action === 'managed_user_updated' ||
        action.endsWith('_updated')
    );
}

function groupNearbyEvents(events: AuditEvent[]): AuditEvent[] {
    if (events.length === 0) return events;

    const WINDOW_MS = 3 * 60 * 1000;
    const result: AuditEvent[] = [];
    let current = { ...events[0] };

    for (let i = 1; i < events.length; i++) {
        const next = events[i];
        const sameActor =
            current.actorUserId != null &&
            current.actorUserId === next.actorUserId;
        const sameEntity = current.entityId === next.entityId;
        const bothGroupable =
            isGroupableAction(current.action) && isGroupableAction(next.action);
        const currentTime = new Date(current.occurredAt).getTime();
        const nextTime = new Date(next.occurredAt).getTime();
        const closeInTime = Math.abs(currentTime - nextTime) < WINDOW_MS;

        const bothMfaToggle =
            current.action === 'mfa_settings_updated' &&
            next.action === 'mfa_settings_updated';

        if (sameActor && sameEntity && bothMfaToggle && closeInTime) {
            current = { ...next };
        } else if (sameActor && sameEntity && bothGroupable && closeInTime) {
            current = {
                ...current,
                action: 'updated',
                diff: { ...(next.diff ?? {}), ...(current.diff ?? {}) },
            };
        } else {
            result.push(current);
            current = { ...next };
        }
    }
    result.push(current);
    return result;
}
