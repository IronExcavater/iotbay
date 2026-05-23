import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { orderApi, type Order } from '@features/orders/api';
import {
    paymentMethodApi,
    type PaymentMethod,
} from '@features/payment-methods/api';
import { paymentsApi, type Payment } from '@features/payments/api';
import { useDocumentTitle } from '@shared/hooks/useDocumentTitle';
import { toErrorMessage } from '@shared/services/http';
import { Button, ButtonLink } from '@shared/ui/form/Button';
import { Field } from '@shared/ui/form/Field';
import { Input } from '@shared/ui/form/Input';
import { PageHeader } from '@shared/ui/PageHeader';
import { useToast } from '@shared/ui/toast/ToastProvider';
import { DateTimeValue } from '@shared/value-objects/DateTimeValue';
import { Money } from '@shared/value-objects/Money';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCardNumber(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 19);
    return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
        return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return digits;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
    useDocumentTitle('Checkout');
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const orderId = searchParams.get('orderId') ?? '';

    // ── Data loading ──────────────────────────────────────────────────────────

    const [order, setOrder] = useState<Order | null>(null);
    const [savedMethods, setSavedMethods] = useState<PaymentMethod[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        if (!orderId) {
            setLoadError('No order ID provided.');
            setIsLoading(false);
            return;
        }

        const controller = new AbortController();
        Promise.all([
            orderApi.get(orderId, controller.signal),
            paymentMethodApi.list(),
        ])
            .then(([fetchedOrder, methods]) => {
                setOrder(fetchedOrder);
                setSavedMethods(methods);
            })
            .catch((err) => {
                if (!controller.signal.aborted) {
                    setLoadError(
                        toErrorMessage(err, 'Unable to load order details')
                    );
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setIsLoading(false);
            });

        return () => controller.abort();
    }, [orderId]);

    // ── Payment mode ──────────────────────────────────────────────────────────

    const [useSaved, setUseSaved] = useState(false);
    const [selectedMethodId, setSelectedMethodId] = useState('');

    useEffect(() => {
        if (savedMethods.length > 0) {
            setUseSaved(true);
            setSelectedMethodId(savedMethods[0].id);
        }
    }, [savedMethods]);

    // ── Raw card fields ───────────────────────────────────────────────────────

    const [cardNumber, setCardNumber] = useState('');
    const [cardHolder, setCardHolder] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvc, setCvc] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // ── Submit state ──────────────────────────────────────────────────────────

    const [isPaying, setIsPaying] = useState(false);
    const [payment, setPayment] = useState<Payment | null>(null);

    // ── Validation ────────────────────────────────────────────────────────────

    function validateCard() {
        const next: Record<string, string> = {};
        const digits = cardNumber.replace(/\s/g, '');

        if (!digits || digits.length < 13 || digits.length > 19) {
            next.cardNumber = 'Card number must be 13–19 digits';
        }
        if (!cardHolder.trim()) {
            next.cardHolder = 'Cardholder name is required';
        }
        if (!/^\d{2}\/\d{2}$/.test(expiry)) {
            next.expiry = 'Use MM/YY format';
        } else if (
            Number.parseInt(expiry.slice(0, 2), 10) < 1 ||
            Number.parseInt(expiry.slice(0, 2), 10) > 12
        ) {
            next.expiry = 'Month must be 01–12';
        }
        if (!cvc || cvc.length < 3) {
            next.cvc = 'CVC must be 3 or 4 digits';
        }

        setFieldErrors(next);
        return Object.keys(next).length === 0;
    }

    // ── Pay ───────────────────────────────────────────────────────────────────

    async function handlePay() {
        if (!orderId) return;

        if (useSaved && !selectedMethodId) {
            showToast('Select a payment method');
            return;
        }
        if (!useSaved && !validateCard()) return;

        setIsPaying(true);
        try {
            const input: Parameters<typeof paymentsApi.payOrder>[1] = useSaved
                ? { paymentMethodId: selectedMethodId }
                : {
                      cardNumber: cardNumber.replace(/\s/g, ''),
                      cardHolder: cardHolder.trim(),
                      expiry,
                  };

            const result = await paymentsApi.payOrder(orderId, input);
            setPayment(result);
        } catch (err) {
            showToast(toErrorMessage(err, 'Payment failed — please try again'));
        } finally {
            setIsPaying(false);
        }
    }

    // ── Render: loading ───────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <section className="mx-auto grid max-w-xl gap-6">
                <div className="bg-ui-100 h-8 w-40 animate-pulse rounded" />
                <div className="bg-ui-0 border-ui-200 grid gap-4 rounded border p-6">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="bg-ui-100 h-10 animate-pulse rounded"
                        />
                    ))}
                </div>
            </section>
        );
    }

    // ── Render: error ─────────────────────────────────────────────────────────

    if (loadError || !order) {
        return (
            <section className="mx-auto grid max-w-xl gap-4">
                <PageHeader title="Checkout" />
                <p className="text-sm text-red-600">
                    {loadError ?? 'Order not found.'}
                </p>
                <ButtonLink to="/orders" variant="secondary">
                    Back to orders
                </ButtonLink>
            </section>
        );
    }

    // ── Render: receipt ───────────────────────────────────────────────────────

    if (payment) {
        return (
            <section className="mx-auto grid max-w-xl gap-6">
                <PageHeader title="Payment confirmed" />

                <div className="grid gap-4 rounded-lg border border-green-200 bg-green-50 p-6">
                    <div className="flex items-center gap-3">
                        <span className="flex size-8 items-center justify-center rounded-full bg-green-500 text-sm font-bold text-white">
                            ✓
                        </span>
                        <h2 className="text-lg font-semibold text-green-800">
                            Payment successful
                        </h2>
                    </div>

                    <dl className="grid gap-2 text-sm">
                        <Row
                            label="Amount"
                            value={Money.format(payment.amountCents)}
                        />
                        <Row
                            label="Card"
                            value={`···· ${payment.cardLast4}`}
                            mono
                        />
                        <Row label="Cardholder" value={payment.cardHolder} />
                        <Row
                            label="Date"
                            value={DateTimeValue.format(
                                payment.paidAt,
                                'short'
                            )}
                        />
                        <Row
                            label="Order ID"
                            value={`${payment.orderId.slice(0, 8)}…`}
                            mono
                        />
                        <Row
                            label="Payment ID"
                            value={`${payment.id.slice(0, 8)}…`}
                            mono
                        />
                    </dl>
                </div>

                <div className="flex flex-wrap gap-3">
                    <Button
                        onClick={() => navigate('/orders')}
                        type="button"
                        variant="primary"
                    >
                        View my orders
                    </Button>
                    <Button
                        onClick={() => navigate('/account/payments')}
                        type="button"
                        variant="secondary"
                    >
                        Payment history
                    </Button>
                    <Button
                        onClick={() => navigate('/products')}
                        type="button"
                        variant="secondary"
                    >
                        Continue shopping
                    </Button>
                </div>
            </section>
        );
    }

    // ── Render: checkout form ─────────────────────────────────────────────────

    return (
        <section className="mx-auto grid max-w-xl gap-6">
            <PageHeader
                description="Review your order and complete payment."
                title="Checkout"
            />

            {/* Order summary */}
            <div className="bg-ui-0 border-ui-200 grid gap-3 rounded border p-5">
                <h2 className="text-ui-900 font-semibold">Order summary</h2>
                {order.items.length > 0 && (
                    <ul className="divide-ui-200 divide-y text-sm">
                        {order.items.map((item) => (
                            <li
                                className="flex items-center justify-between gap-3 py-2"
                                key={item.productId}
                            >
                                <span className="text-ui-700">
                                    {item.name} × {item.quantity}
                                </span>
                                <span className="text-ui-900 font-medium">
                                    {Money.format(
                                        item.priceCents * item.quantity
                                    )}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
                <div className="border-ui-200 flex justify-between border-t pt-3 font-semibold">
                    <span>Total</span>
                    <span>{Money.format(order.totalCents)}</span>
                </div>
            </div>

            {/* Payment section */}
            <div className="bg-ui-0 border-ui-200 grid gap-5 rounded border p-5">
                <h2 className="text-ui-900 font-semibold">Payment</h2>

                {/* Mode toggle — only shown when saved methods exist */}
                {savedMethods.length > 0 && (
                    <div className="flex gap-2">
                        <button
                            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                                useSaved
                                    ? 'bg-ui-900 text-ui-0'
                                    : 'bg-ui-100 text-ui-700 hover:bg-ui-200'
                            }`}
                            onClick={() => setUseSaved(true)}
                            type="button"
                        >
                            Saved card
                        </button>
                        <button
                            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                                !useSaved
                                    ? 'bg-ui-900 text-ui-0'
                                    : 'bg-ui-100 text-ui-700 hover:bg-ui-200'
                            }`}
                            onClick={() => setUseSaved(false)}
                            type="button"
                        >
                            New card
                        </button>
                    </div>
                )}

                {/* Saved method selector */}
                {useSaved && savedMethods.length > 0 && (
                    <div className="grid gap-2">
                        {savedMethods.map((method) => (
                            <label
                                className={`border-ui-200 flex cursor-pointer items-center gap-3 rounded border p-3 transition ${
                                    selectedMethodId === method.id
                                        ? 'border-ui-900 bg-ui-50'
                                        : 'hover:bg-ui-50'
                                }`}
                                key={method.id}
                            >
                                <input
                                    checked={selectedMethodId === method.id}
                                    className="accent-ui-900"
                                    name="savedMethod"
                                    onChange={() =>
                                        setSelectedMethodId(method.id)
                                    }
                                    type="radio"
                                    value={method.id}
                                />
                                <div className="grid gap-0.5">
                                    <span className="text-ui-900 text-sm font-medium capitalize">
                                        {method.type} ···· {method.cardLast4}
                                    </span>
                                    <span className="text-ui-500 text-xs">
                                        {method.cardholderName} · Expires{' '}
                                        {method.expiry}
                                    </span>
                                </div>
                            </label>
                        ))}

                        <p className="text-ui-500 text-xs">
                            Manage your{' '}
                            <button
                                className="text-blue-600 underline underline-offset-2"
                                onClick={() => navigate(-1)}
                                type="button"
                            >
                                Payment Method
                            </button>
                            .
                        </p>
                    </div>
                )}

                {/* New card entry */}
                {!useSaved && (
                    <div className="grid gap-4">
                        <Field
                            error={fieldErrors.cardNumber}
                            label="Card number"
                            required
                        >
                            <Input
                                hasError={Boolean(fieldErrors.cardNumber)}
                                inputMode="numeric"
                                maxLength={23}
                                onChange={(e) =>
                                    setCardNumber(
                                        formatCardNumber(e.target.value)
                                    )
                                }
                                placeholder="4111 1111 1111 1111"
                                value={cardNumber}
                            />
                        </Field>

                        <Field
                            error={fieldErrors.cardHolder}
                            label="Cardholder name"
                            required
                        >
                            <Input
                                hasError={Boolean(fieldErrors.cardHolder)}
                                onChange={(e) => setCardHolder(e.target.value)}
                                placeholder="Jane Smith"
                                value={cardHolder}
                            />
                        </Field>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field
                                error={fieldErrors.expiry}
                                label="Expiry (MM/YY)"
                                required
                            >
                                <Input
                                    hasError={Boolean(fieldErrors.expiry)}
                                    maxLength={5}
                                    onChange={(e) =>
                                        setExpiry(formatExpiry(e.target.value))
                                    }
                                    placeholder="MM/YY"
                                    value={expiry}
                                />
                            </Field>

                            <Field error={fieldErrors.cvc} label="CVC" required>
                                <Input
                                    hasError={Boolean(fieldErrors.cvc)}
                                    inputMode="numeric"
                                    maxLength={4}
                                    onChange={(e) =>
                                        setCvc(
                                            e.target.value
                                                .replace(/\D/g, '')
                                                .slice(0, 4)
                                        )
                                    }
                                    placeholder="123"
                                    value={cvc}
                                />
                            </Field>
                        </div>

                        <p className="text-ui-400 bg-ui-50 rounded p-3 text-xs">
                            🔒 This is a simulated payment — no real card is
                            charged. Use a card ending in{' '}
                            <span className="font-mono font-medium">0000</span>{' '}
                            to test a declined payment.
                        </p>
                    </div>
                )}

                <Button
                    disabled={isPaying}
                    loading={isPaying}
                    onClick={() => void handlePay()}
                    type="button"
                    variant="primary"
                >
                    Pay {Money.format(order.totalCents)}
                </Button>
            </div>
        </section>
    );
}

// ── Row helper ────────────────────────────────────────────────────────────────

function Row({
    label,
    value,
    mono = false,
}: {
    label: string;
    value: string;
    mono?: boolean;
}) {
    return (
        <div className="flex justify-between gap-3">
            <dt className="text-ui-500">{label}</dt>
            <dd
                className={`text-ui-900 font-medium ${mono ? 'font-mono' : ''}`}
            >
                {value}
            </dd>
        </div>
    );
}
