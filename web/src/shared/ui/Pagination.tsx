import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';

interface PaginationProps {
    onChange: (page: number) => void;
    page: number;
    totalPages: number;
}

export function Pagination({ onChange, page, totalPages }: PaginationProps) {
    if (totalPages <= 1) return null;

    const slots = buildPageSlots(page, totalPages);

    return (
        <nav
            aria-label="Pagination"
            className="flex items-center justify-center gap-1"
        >
            <PageStepButton
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => onChange(page - 1)}
            >
                <FaChevronLeft aria-hidden="true" className="size-3" />
            </PageStepButton>

            {slots.map((slot, i) =>
                slot === null ? (
                    <span
                        className="text-ui-400 flex h-9 w-7 items-center justify-center text-sm select-none"
                        key={`gap-${i}`}
                    >
                        &hellip;
                    </span>
                ) : (
                    <button
                        key={slot}
                        aria-current={slot === page ? 'page' : undefined}
                        aria-label={`Page ${slot}`}
                        className={`focus-visible:ring-ui-900 inline-flex h-9 min-w-9 items-center justify-center rounded px-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 ${
                            slot === page
                                ? 'bg-ui-950 text-ui-0'
                                : 'text-ui-600 hover:bg-ui-100 hover:text-ui-900'
                        }`}
                        onClick={() => onChange(slot)}
                        type="button"
                    >
                        {slot}
                    </button>
                )
            )}

            <PageStepButton
                aria-label="Next page"
                disabled={page >= totalPages}
                onClick={() => onChange(page + 1)}
            >
                <FaChevronRight aria-hidden="true" className="size-3" />
            </PageStepButton>
        </nav>
    );
}

function PageStepButton({
    children,
    disabled,
    onClick,
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { disabled: boolean }) {
    return (
        <button
            className="text-ui-500 hover:bg-ui-100 hover:text-ui-900 disabled:text-ui-300 focus-visible:ring-ui-900 inline-flex h-9 w-9 items-center justify-center rounded transition-colors outline-none focus-visible:ring-2 disabled:cursor-not-allowed"
            disabled={disabled}
            onClick={onClick}
            type="button"
            {...props}
        >
            {children}
        </button>
    );
}

function buildPageSlots(current: number, total: number): (number | null)[] {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    const included = new Set<number>();
    included.add(1);
    included.add(total);
    for (let d = -2; d <= 2; d++) {
        const p = current + d;
        if (p >= 1 && p <= total) included.add(p);
    }

    const sorted = [...included].sort((a, b) => a - b);
    const slots: (number | null)[] = [];

    for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
            slots.push(null);
        }
        slots.push(sorted[i]);
    }

    return slots;
}
