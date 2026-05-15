const STATUS_STYLES: Record<string, string> = {
    cancelled: 'bg-red-100 text-red-700 ring-red-200',
    paid: 'bg-green-100 text-green-700 ring-green-200',
    saved: 'bg-amber-50 text-amber-700 ring-amber-200',
};

export function OrderStatusBadge({ status }: { status: string }) {
    const style = STATUS_STYLES[status] ?? 'bg-ui-100 text-ui-700 ring-ui-200';
    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ${style}`}
        >
            {status}
        </span>
    );
}
