import { useEffect, useMemo, useState } from 'react';

import { FaPenToSquare } from 'react-icons/fa6';
import { AddressFields } from '@features/addresses/components/AddressFields';
import {
    orderApi,
    type Order,
    type OrderSearchParams,
} from '@features/orders/api';
import { OrderStatusBadge } from '@features/orders/components/OrderStatusBadge';
import { useDocumentTitle } from '@shared/hooks/useDocumentTitle';
import { Button, ButtonLink } from '@shared/ui/form/Button';
import { PageHeader } from '@shared/ui/PageHeader';
import { useToast } from '@shared/ui/toast/ToastProvider';
import { DateTimeValue } from '@shared/value-objects/DateTimeValue';
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
        void fetchOrders(controller.signal);
        return () => controller.abort();
    }, []);

    function handleSearch(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const params: OrderSearchParams = {};
        if (searchDate) params.date = searchDate;
        fetchOrders(undefined, params);
    }

    function handleClear() {
        setSearchId('');
        setSearchDate('');
        fetchOrders();
    }

    const filteredOrders = useMemo(() => {
        if (!searchId.trim()) return orders;
        const query = searchId.trim().toLowerCase();
        return orders.filter((order) => order.id.toLowerCase().includes(query));
    }, [orders, searchId]);

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

            {loading && (
                <p className="text-ui-500 text-sm">Loading orders...</p>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            {!loading && !error && orders.length === 0 && (
                <div className="bg-ui-0 border-ui-200 grid justify-items-center gap-3 rounded border px-5 py-12 text-center">
                    <p className="text-ui-500 text-sm">No orders yet.</p>
                    <ButtonLink to="/products" variant="secondary">
                        Browse catalogue
                    </ButtonLink>
                </div>
            )}

            {!loading && orders.length > 0 && (
                <ul className="grid gap-4">
                    {filteredOrders.map((order) => (
                        <OrderCard
                            key={order.id}
                            order={order}
                            onStatusChange={() => void fetchOrders()}
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
    const [isEditingAddress, setIsEditingAddress] = useState(false);
    const [addressValues, setAddressValues] = useState({
        addressLineOne: order.shippingAddressLineOne ?? '',
        addressLineTwo: order.addressLineTwo ?? '',
        suburb: order.shippingSuburb ?? '',
        state: order.shippingState ?? '',
        postcode: order.shippingPostcode ?? '',
        country: order.shippingCountry ?? '',
    });
    const [addressErrors, setAddressErrors] = useState<Record<string, string>>(
        {}
    );
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

    function handleAddressFieldChange(
        name: keyof typeof addressValues,
        value: string
    ) {
        setAddressValues((prev) => ({
            ...prev,
            [name]: value,
        }));
        setAddressErrors((prev) => ({
            ...prev,
            [name]: '',
        }));
    }

    async function handleSaveAddress() {
        const errors: Record<string, string> = {};
        if (!addressValues.addressLineOne?.trim()) {
            errors.addressLineOne = 'Address line 1 is required';
        }
        if (!addressValues.addressLineTwo?.trim()) {
            errors.addressLineTwo = 'Address line 2 is required';
        }
        if (!addressValues.suburb?.trim()) {
            errors.suburb = 'Suburb is required';
        }
        if (!addressValues.state?.trim()) {
            errors.state = 'State is required';
        }
        if (!addressValues.postcode?.trim()) {
            errors.postcode = 'Postcode is required';
        }
        if (!addressValues.country?.trim()) {
            errors.country = 'Country is required';
        }

        if (Object.keys(errors).length > 0) {
            setAddressErrors(errors);
            return;
        }

        try {
            await orderApi.updateAddress(order.id, addressValues);
            showToast('Address updated successfully');
            setIsEditingAddress(false);
            onStatusChange();
        } catch (err) {
            showToast('Failed to update address');
            console.error(err);
        }
    }

    function handleCancelAddressEdit() {
        setAddressValues({
            addressLineOne: order.shippingAddressLineOne ?? '',
            addressLineTwo: order.addressLineTwo ?? '',
            suburb: order.shippingSuburb ?? '',
            state: order.shippingState ?? '',
            postcode: order.shippingPostcode ?? '',
            country: order.shippingCountry ?? '',
        });
        setAddressErrors({});
        setIsEditingAddress(false);
    }

    const canCancel = order.status === 'saved';

    const subtotalCents = order.items.reduce(
        (sum, item) => sum + item.priceCents * item.quantity,
        0
    );
    const deliveryCents = order.items.length > 0 ? 1200 : 0;

    return (
        <li
            className={`border-ui-200 grid gap-4 rounded border p-5 ${
                order.status === 'cancelled'
                    ? 'bg-red-50 opacity-70 grayscale'
                    : 'bg-ui-0'
            }`}
        >
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="grid gap-1">
                    <div className="flex items-center gap-2">
                        <span className="text-ui-500 text-xs">Order ID:</span>
                        <span className="text-ui-800 font-mono text-sm">
                            {order.id.slice(0, 8)}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-ui-500 text-xs">Date:</span>
                        <span className="text-ui-800 text-xs">
                            {DateTimeValue.format(order.createdAt, 'long')}
                        </span>
                    </div>
                    <div className="grid gap-1">
                        {!isEditingAddress ? (
                            <>
                                <span className="text-ui-800 text-sm">
                                    Address
                                </span>
                                <div className="flex items-center gap-2">
                                    <div className="rounded-sm border border-gray-200 p-2">
                                        <span className="text-ui-700 font-mono text-xs">
                                            {order.shippingAddress ||
                                                'No address provided'}
                                        </span>
                                    </div>
                                    {order.status === 'saved' && (
                                        <Button
                                            aria-label="Edit address"
                                            className="inline-flex items-center gap-1 rounded-md px-3 py-2"
                                            onClick={() =>
                                                setIsEditingAddress(true)
                                            }
                                            type="button"
                                            variant="ghost"
                                        >
                                            <FaPenToSquare
                                                aria-hidden="true"
                                                className="size-3.5"
                                            />
                                            <span className="text-ui-500 text-xs">
                                                Edit
                                            </span>
                                        </Button>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <AddressFields
                                    countryCode={addressValues.country}
                                    errors={addressErrors}
                                    onFieldChange={handleAddressFieldChange}
                                    values={addressValues}
                                />
                                <div className="mt-3 flex justify-end gap-2">
                                    <Button
                                        variant="secondary"
                                        onClick={handleCancelAddressEdit}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={handleSaveAddress}
                                    >
                                        Save
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <OrderStatusBadge status={order.status} />
                    {canCancel && (
                        <>
                            <Button
                                className="h-8 px-2 text-xs"
                                disabled={cancelling}
                                onClick={handleCancel}
                                type="button"
                                variant="danger"
                            >
                                Cancel
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {order.items.length > 0 && (
                <ul className="divide-ui-200 divide-y text-sm">
                    {order.items.map((item) => (
                        <li
                            className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                            key={item.productId}
                        >
                            <div className="flex min-w-0 items-center gap-3">
                                <img
                                    alt=""
                                    className="bg-ui-100 size-10 rounded object-cover"
                                    src={
                                        item.imageUrl ||
                                        '/iotbay_icon_themed.svg'
                                    }
                                />
                                <span className="grid min-w-0 gap-0.5">
                                    <span className="text-ui-900 truncate font-medium">
                                        {item.name}
                                    </span>
                                    <span className="text-ui-500">
                                        {Money.format(item.priceCents)} x{' '}
                                        {item.quantity}
                                    </span>
                                </span>
                            </div>
                            <span className="text-ui-900 font-semibold sm:text-right">
                                {Money.format(item.priceCents * item.quantity)}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
            <div className="flex justify-end">
                <div className="grid gap-2 text-sm">
                    <SummaryRow
                        label="Subtotal"
                        value={Money.format(subtotalCents)}
                    />
                    <SummaryRow
                        label="Delivery"
                        value={
                            order.items.length > 0
                                ? Money.format(deliveryCents)
                                : Money.format(0)
                        }
                    />
                    <div className="border-ui-200 mt-1 flex justify-between border-t pt-3 text-base font-semibold">
                        <span>Total</span>
                        <span>{Money.format(order.totalCents)}</span>
                    </div>
                </div>
            </div>
            <div className="flex justify-end">
                {canCancel && (
                    <>
                        <ButtonLink
                            className="h-8 px-2 text-xs"
                            to={`/checkout?orderId=${order.id}`}
                        >
                            Pay
                        </ButtonLink>
                    </>
                )}
            </div>
        </li>
    );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="text-ui-600 flex justify-between gap-3">
            <span>{label}</span>
            <span className="text-ui-900">{value}</span>
        </div>
    );
}
