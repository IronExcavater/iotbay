import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { orderApi, type Order } from '@features/orders/api';
import { useDocumentTitle } from '@shared/hooks/useDocumentTitle';
import { PageHeader } from '@shared/ui/PageHeader';
import { useToast } from '@shared/ui/toast/ToastProvider';
import { Money } from '@shared/value-objects/Money';

export default function OrdersPage() {
    useDocumentTitle('Orders');
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOrders = (signal?: AbortSignal) => {
        return orderApi
            .list(signal)
            .then(setOrders)
            .catch((err) => {
                if (!signal?.aborted) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : 'Failed to load orders'
                    );
                }
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        const controller = new AbortController();
        fetchOrders(controller.signal);
        return () => controller.abort();
    }, []);

    return (
        <section className="grid gap-6">
            <PageHeader
                description="Orders placed from this account will appear here."
                title="Orders"
            />

            {loading && <p className="text-ui-500 text-sm">Loading orders…</p>}

            {error && <p className="text-sm text-red-600">{error}</p>}

            {!loading && !error && orders.length === 0 && (
                <div className="bg-ui-0 border-ui-200 grid justify-items-center gap-3 rounded border px-5 py-12 text-center">
                    <p className="text-ui-500 text-sm">No orders yet.</p>
                    <Link
                        className="text-sm font-medium text-blue-600 hover:underline"
                        to="/products"
                    >
                        Browse catalogue
                    </Link>
                </div>
            )}

            {!loading && orders.length > 0 && (
                <ul className="grid gap-4">
                    {orders.map((order) => (
                        <OrderCard
                            key={order.id}
                            order={order}
                            onStatusChange={() => fetchOrders()}
                        />
                    ))}
                </ul>
            )}
        </section>
    );
}

function OrderCard({
    order,
    onStatusChange,
}: {
    order: Order;
    onStatusChange: () => void;
}) {
    const [cancelling, setCancelling] = useState(false);
    const { showToast } = useToast();

    async function handleCancel() {
        setCancelling(true);
        try {
            await orderApi.updateStatus(order.id, { status: 'cancelled' });
            onStatusChange();
        } catch {
            showToast('Cancellation failed');
        } finally {
            setCancelling(false);
        }
    }

    const canCancel = order.status === 'saved';

    return (
        <li
            className={`${order.status === 'cancelled' ? 'bg-red-50 opacity-60 grayscale' : 'bg-ui-0'} bg-ui-0 border-ui-200 grid gap-4 rounded border p-5`}
        >
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="grid gap-1">
                    <span className="text-ui-500 text-xs">
                        {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <OrderStatusBadge status={order.status} />
                    {canCancel && (
                        <button
                            className="text-xs text-red-600 hover:underline disabled:opacity-50"
                            disabled={cancelling}
                            onClick={handleCancel}
                            type="button"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>

            {order.items.length > 0 && (
                <ul className="divide-ui-200 divide-y text-sm">
                    {order.items.map((item) => (
                        <li
                            className="flex items-center justify-between gap-3 py-2"
                            key={item.productId}
                        >
                            <div className="flex items-center gap-3">
                                {item.imageUrl && (
                                    <img
                                        alt=""
                                        className="bg-ui-100 size-8 rounded object-cover"
                                        src={item.imageUrl}
                                    />
                                )}
                                <span className="text-ui-900">{item.name}</span>
                                {item.quantity > 1 && (
                                    <span className="text-ui-500">
                                        ×{item.quantity}
                                    </span>
                                )}
                            </div>
                            <span className="text-ui-700">
                                {Money.format(item.priceCents * item.quantity)}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
            <div className="flex justify-end">
                <span className="text-ui-900 font-semibold">
                    Total: {Money.format(order.totalCents)}
                </span>
            </div>
        </li>
    );
}

const STATUS_STYLES: Record<string, string> = {
    cancelled: 'bg-red-100 text-red-700',
    paid: 'bg-blue-100 text-blue-700',
    saved: 'bg-green-100 text-green-700',
};

function OrderStatusBadge({ status }: { status: string }) {
    const style = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700';
    return (
        <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${style}`}
        >
            {status}
        </span>
    );
}
