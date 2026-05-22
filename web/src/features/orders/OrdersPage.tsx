import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import {
    orderApi,
    type Order,
    type OrderSearchParams,
} from '@features/orders/api';
import { useDocumentTitle } from '@shared/hooks/useDocumentTitle';
import { Button } from '@shared/ui/form/Button';
import { PageHeader } from '@shared/ui/PageHeader';
import { useToast } from '@shared/ui/toast/ToastProvider';
import { Money } from '@shared/value-objects/Money';

export default function OrdersPage() {
    useDocumentTitle('Orders');
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchId, setSearchId] = useState('');
    const [searchDate, setSearchDate] = useState('');

    const fetchOrders = (signal?: AbortSignal, params?: OrderSearchParams) => {
        setLoading(true);
        setError(null);
        return orderApi
            .list(params, signal)
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

    function handleSearch(e: React.ChangeEvent) {
        e.preventDefault();
        const params: OrderSearchParams = {};
        if (searchId.trim()) params.orderId = searchId.trim();
        if (searchDate) params.date = searchDate;
        fetchOrders(undefined, params);
    }

    function handleClear() {
        setSearchId('');
        setSearchDate('');
        fetchOrders();
    }

    return (
        <section className="grid gap-6">
            <PageHeader
                description="Orders placed from this account will appear here."
                title="Orders"
            />
            <form
                onSubmit={handleSearch}
                className="flex flex-wrap items-end gap-3"
            >
                <div className="grid gap-1">
                    <label
                        htmlFor="search-order-id"
                        className="text-ui-500 text-xs"
                    >
                        Order ID
                    </label>
                    <input
                        id="search-order-id"
                        type="text"
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                        placeholder="Paste order ID…"
                        className="border-ui-200 rounded border px-3 py-1.5 text-sm"
                    />
                </div>
                <div className="grid gap-1">
                    <label
                        htmlFor="search-date"
                        className="text-ui-500 text-xs"
                    >
                        Date
                    </label>
                    <input
                        id="search-date"
                        type="date"
                        value={searchDate}
                        onChange={(e) => setSearchDate(e.target.value)}
                        className="border-ui-200 rounded border px-3 py-1.5 text-sm"
                    />
                </div>
                <Button type="submit">Search</Button>
                <Button type="button" variant="secondary" onClick={handleClear}>
                    Clear
                </Button>
            </form>

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
                    <div className="flex items-center gap-2">
                        <span className="text-ui-500 text-xs">Order ID:</span>
                        <span className="text-ui-700 font-mono text-xs">
                            {order.id}
                        </span>
                    </div>
                    <span className="text-ui-500 text-xs">
                        {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <OrderStatusBadge status={order.status} />
                    {canCancel && (
                        <Button
                            disabled={cancelling}
                            onClick={handleCancel}
                            type="button"
                            variant="danger"
                        >
                            Cancel
                        </Button>
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
                                {item.quantity > 0 && (
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
