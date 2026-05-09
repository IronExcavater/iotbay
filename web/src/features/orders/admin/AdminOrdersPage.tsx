import { useEffect, useState } from 'react';
import type { Order } from '@features/orders/api';
import { useDocumentTitle } from '@shared/hooks/useDocumentTitle';
import { getJson } from '@shared/services/http';
import { PageHeader } from '@shared/ui/PageHeader';
import { Money } from '@shared/value-objects/Money';

export default function AdminOrdersPage() {
    useDocumentTitle('All Orders');
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchId, setSearchId] = useState('');
    const [searchDate, setSearchDate] = useState('');

    function fetchOrders(signal?: AbortSignal) {
        setLoading(true);
        getJson<Order[]>('/api/staff/all', signal)
            .then((data) => {
                setOrders(data);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        const controller = new AbortController();
        fetchOrders(controller.signal);
        return () => controller.abort();
    }, []);

    const filteredOrders = orders.filter((order) => {
        let matches = true;
        if (searchId.trim()) {
            matches =
                matches &&
                order.id.toLowerCase().includes(searchId.trim().toLowerCase());
        }
        if (searchDate) {
            matches = matches && order.createdAt.startsWith(searchDate);
        }
        return matches;
    });

    return (
        <section className="grid gap-6">
            <PageHeader
                title="All Customer Orders"
                description="View and manage orders across all customers."
            />

            <form
                className="flex flex-wrap items-end gap-3"
                onSubmit={(e) => e.preventDefault()}
            >
                <div className="grid gap-1">
                    <label
                        htmlFor="admin-search-order-id"
                        className="text-ui-500 text-xs"
                    >
                        Order ID
                    </label>
                    <input
                        id="admin-search-order-id"
                        type="text"
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                        placeholder="Search by order ID…"
                        className="border-ui-200 rounded border px-3 py-1.5 text-sm"
                    />
                </div>
                <div className="grid gap-1">
                    <label
                        htmlFor="admin-search-date"
                        className="text-ui-500 text-xs"
                    >
                        Date
                    </label>
                    <input
                        id="admin-search-date"
                        type="date"
                        value={searchDate}
                        onChange={(e) => setSearchDate(e.target.value)}
                        className="border-ui-200 rounded border px-3 py-1.5 text-sm"
                    />
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setSearchId('');
                        setSearchDate('');
                    }}
                    className="text-ui-500 text-sm hover:underline"
                >
                    Clear
                </button>
            </form>

            {loading && <p className="text-ui-500 text-sm">Loading…</p>}
            {!loading && filteredOrders.length === 0 && (
                <p className="text-ui-500 text-sm">No orders found.</p>
            )}
            {!loading && filteredOrders.length > 0 && (
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b text-left">
                            <th className="py-2">Order ID</th>
                            <th className="py-2">Date</th>
                            <th className="py-2">Status</th>
                            <th className="py-2">Items</th>
                            <th className="py-2 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.map((order) => (
                            <tr key={order.id} className="border-b">
                                <td className="py-2 font-mono text-xs">
                                    {order.id.slice(0, 8)}…
                                </td>
                                <td className="py-2">
                                    {new Date(
                                        order.createdAt
                                    ).toLocaleDateString()}
                                </td>
                                <td className="py-2 capitalize">
                                    {order.status}
                                </td>
                                <td className="py-2">{order.items.length}</td>
                                <td className="py-2 text-right">
                                    {Money.format(order.totalCents)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </section>
    );
}
