import { FaArrowRotateLeft, FaArrowRotateRight } from 'react-icons/fa6';

import type { AuditEvent } from '@features/audit/api';
import { Button } from '@shared/ui/form/Button';
import { DateTimeValue } from '@shared/value-objects/DateTimeValue';

interface AuditTimelineProps {
    canReplay: boolean;
    events: AuditEvent[];
    isLoading?: boolean;
    onRedo: (event: AuditEvent) => void;
    onUndo: (event: AuditEvent) => void;
    pendingEventId?: string | null;
}

export function AuditTimeline({
    canReplay,
    events,
    isLoading = false,
    onRedo,
    onUndo,
    pendingEventId = null,
}: AuditTimelineProps) {
    return (
        <section className="grid gap-4">
            <div>
                <h2 className="text-ui-900 text-lg font-semibold">
                    Change history
                </h2>
                <p className="text-ui-500 text-sm">
                    Minimal audit trail with point-in-time undo and redo.
                </p>
            </div>

            {isLoading ? (
                <p className="text-ui-500 text-sm">Loading history...</p>
            ) : events.length === 0 ? (
                <p className="text-ui-500 text-sm">No changes recorded yet.</p>
            ) : (
                <ol className="relative grid gap-0 pl-6">
                    <span
                        aria-hidden="true"
                        className="bg-ui-200 absolute top-3 bottom-3 left-2 w-px"
                    />
                    {events.map((event) => (
                        <li className="relative pb-5 last:pb-0" key={event.id}>
                            <span
                                aria-hidden="true"
                                className="bg-ui-0 ring-ui-300 absolute top-1.5 -left-4.5 size-3 rounded-full ring-2"
                            />
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="grid gap-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-ui-900 text-sm font-medium">
                                            {formatAction(event)}
                                        </span>
                                        {event.origin !== 'direct' && (
                                            <span className="text-ui-500 text-xs">
                                                {event.origin}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-ui-500 text-sm">
                                        {event.actorName ||
                                            event.actorEmail ||
                                            'System'}{' '}
                                        -{' '}
                                        {DateTimeValue.format(
                                            event.occurredAt,
                                            'relative'
                                        )}
                                    </span>
                                    {event.diff && (
                                        <span className="text-ui-500 text-xs">
                                            {Object.keys(event.diff)
                                                .map(humanize)
                                                .join(', ')}
                                        </span>
                                    )}
                                </div>

                                {canReplay && (
                                    <div className="flex gap-1">
                                        <Button
                                            aria-label={`Undo ${formatAction(event)}`}
                                            className="size-8 rounded-full p-0"
                                            loading={
                                                pendingEventId === event.id
                                            }
                                            onClick={() => onUndo(event)}
                                            type="button"
                                            variant="ghost"
                                        >
                                            <FaArrowRotateLeft
                                                aria-hidden="true"
                                                className="size-3.5"
                                            />
                                        </Button>
                                        <Button
                                            aria-label={`Redo ${formatAction(event)}`}
                                            className="size-8 rounded-full p-0"
                                            loading={
                                                pendingEventId === event.id
                                            }
                                            onClick={() => onRedo(event)}
                                            type="button"
                                            variant="ghost"
                                        >
                                            <FaArrowRotateRight
                                                aria-hidden="true"
                                                className="size-3.5"
                                            />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
}

function formatAction(event: AuditEvent) {
    return humanize(event.action);
}

function humanize(value: string) {
    return value
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
}
