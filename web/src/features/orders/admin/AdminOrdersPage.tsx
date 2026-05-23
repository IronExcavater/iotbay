import { useEffect, useRef, useState } from 'react';

import { orderApi, type Order } from '@features/orders/api';
import { OrderStatusBadge } from '@features/orders/components/OrderStatusBadge';
import { useDebounce } from '@shared/hooks/useDebounce';
import { useDocumentTitle } from '@shared/hooks/useDocumentTitle';
import { Button } from '@shared/ui/form/Button';
import { Field } from '@shared/ui/form/Field';
import { Input } from '@shared/ui/form/Input';
import { SearchInput } from '@shared/ui/form/SearchInput';
import { PageHeader } from '@shared/ui/PageHeader';
import { Pagination } from '@shared/ui/Pagination';
import {
    Table,
    TableHead,
    TableLoadingRow,
    TableMessageRow,
} from '@shared/ui/table/Table';
import { DateTimeValue } from '@shared/value-objects/DateTimeValue';
import { Money } from '@shared/value-objects/Money';

export default function AdminOrdersPage() {
    useDocumentTitle('All Orders');
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [ordersError, setOrdersError] = useState<string | null>(null);
    const [searchId, setSearchId] = useState('');
    const [searchDate, setSearchDate] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const debouncedId = useDebounce(searchId, 350);

    const stablePages = useRef(1);
    if (!isLoading) stablePages.current = totalPages;

    useEffect(() => {
        const ac = new AbortController();
        setIsLoading(true);

        void orderApi
            .listAll(
                {
                    orderId: debouncedId.trim() || undefined,
                    date: searchDate || undefined,
                    page,
                },
                ac.signal
            )
            .then(({ items, pages }) => {
                if (!ac.signal.aborted) {
                    setOrders(items);
                    setTotalPages(pages);
                    setOrdersError(null);
                }
            })
            .catch((error) => {
                if (!ac.signal.aborted) {
                    setOrdersError(
                        error instanceof Error
                            ? error.message
                            : 'Unable to load orders'
                    );
                }
            })
            .finally(() => {
                if (!ac.signal.aborted) setIsLoading(false);
            });

        return () => ac.abort();
    }, [debouncedId, searchDate, page]);

    function handleIdChange(value: string) {
        setSearchId(value);
        setPage(1);
    }

    function handleDateChange(value: string) {
        setSearchDate(value);
        setPage(1);
    }

    const hasSearch = Boolean(debouncedId.trim() || searchDate);

    return (
        <section className="grid gap-6">
            <PageHeader
                description="View and manage orders across all customers."
                title="All customer orders"
            />

            <div className="bg-ui-0 border-ui-200 overflow-hidden rounded border">
                <div className="border-ui-200 flex flex-wrap items-center gap-3 border-b px-5 py-4">
                    <SearchInput
                        className="w-56"
                        onChange={handleIdChange}
                        placeholder="Search by order ID"
                        value={searchId}
                    />

                    <Field label="Date">
                        <Input
                            id="admin-search-date"
                            onChange={(event) =>
                                handleDateChange(event.target.value)
                            }
                            type="date"
                            value={searchDate}
                        />
                    </Field>

                    {hasSearch && (
                        <Button
                            onClick={() => {
                                setSearchId('');
                                setSearchDate('');
                                setPage(1);
                            }}
                            type="button"
                            variant="ghost"
                        >
                            Clear
                        </Button>
                    )}
                </div>

                <div
                    className={`overflow-x-auto transition-opacity ${
                        isLoading && orders.length > 0
                            ? 'pointer-events-none opacity-60'
                            : ''
                    }`}
                >
                    <Table>
                        <colgroup>
                            <col className="w-[18%]" />
                            <col className="w-[18%]" />
                            <col className="w-[14%]" />
                            <col className="w-[32%]" />
                            <col className="w-[18%]" />
                        </colgroup>
                        <TableHead>
                            <tr>
                                <th className="px-5 py-3">Order ID</th>
                                <th className="px-5 py-3">Date</th>
                                <th className="px-5 py-3">Status</th>
                                <th className="px-5 py-3">Items</th>
                                <th className="px-5 py-3 text-right">Total</th>
                            </tr>
                        </TableHead>
                        <tbody>
                            {isLoading && orders.length === 0 ? (
                                <>
                                    <TableLoadingRow colSpan={5} />
                                    <TableLoadingRow colSpan={5} />
                                    <TableLoadingRow colSpan={5} />
                                </>
                            ) : ordersError ? (
                                <TableMessageRow
                                    colSpan={5}
                                    message={ordersError}
                                    tone="error"
                                />
                            ) : orders.length === 0 ? (
                                <TableMessageRow
                                    colSpan={5}
                                    message={
                                        hasSearch
                                            ? 'No orders matched your search.'
                                            : 'No orders yet.'
                                    }
                                    tone="muted"
                                />
                            ) : (
                                orders.map((order) => (
                                    <tr
                                        className="border-ui-200 border-t align-top"
                                        key={order.id}
                                    >
                                        <td className="px-5 py-3 font-mono text-xs">
                                            {order.id.slice(0, 8)}
                                        </td>
                                        <td className="text-ui-600 px-5 py-3">
                                            {DateTimeValue.format(
                                                order.createdAt,
                                                'short'
                                            )}
                                        </td>
                                        <td className="px-5 py-3">
                                            <OrderStatusBadge
                                                status={order.status}
                                            />
                                        </td>
                                        <td className="text-ui-600 px-5 py-3">
                                            {order.items.length} item
                                            {order.items.length === 1
                                                ? ''
                                                : 's'}
                                        </td>
                                        <td className="px-5 py-3 text-right font-semibold">
                                            {Money.format(order.totalCents)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </div>

                {stablePages.current > 1 && (
                    <div className="border-ui-200 border-t px-5 py-3">
                        <Pagination
                            onChange={setPage}
                            page={page}
                            totalPages={stablePages.current}
                        />
                    </div>
                )}
            </div>
        </section>
    );
}
