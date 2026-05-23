import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { paymentsApi, type Payment } from '@features/payments/api';
import { useDocumentTitle } from '@shared/hooks/useDocumentTitle';
import { toErrorMessage } from '@shared/services/http';
import { PageHeader } from '@shared/ui/PageHeader';
import { DateTimeValue } from '@shared/value-objects/DateTimeValue';
import { Money } from '@shared/value-objects/Money';

/**
 * PaymentHistoryPage  –  /account/payments
 *
 * Shows all payments made by the current customer.
 * Accessible from the Account nav and from the checkout receipt.
 */
export default function PaymentHistoryPage() {
    useDocumentTitle('Payment history');
    const [payments, setPayments] = useState<Payment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        paymentsApi
            .listMine(controller.signal)
            .then(setPayments)
            .catch((err) => {
                if (!controller.signal.aborted) {
                    setError(
                        toErrorMessage(err, 'Unable to load payment history')
                    );
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setIsLoading(false);
            });
        return () => controller.abort();
    }, []);

    return (
        <section className="grid gap-6">
            <PageHeader
                description="All payments made from this account."
                title="Payment history"
            />

            {isLoading && (
                <div className="grid gap-3">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="bg-ui-100 h-16 animate-pulse rounded"
                        />
                    ))}
                </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            {!isLoading && !error && payments.length === 0 && (
                <div className="bg-ui-0 border-ui-200 grid justify-items-center gap-3 rounded border px-5 py-12 text-center">
                    <p className="text-ui-500 text-sm">No payments yet.</p>
                    <Link
                        className="text-sm font-medium text-blue-600 hover:underline"
                        to="/products"
                    >
                        Browse catalogue
                    </Link>
                </div>
            )}

            {!isLoading && payments.length > 0 && (
                <ul className="grid gap-3">
                    {payments.map((payment) => (
                        <li
                            key={payment.id}
                            className={`bg-ui-0 border-ui-200 grid gap-3 rounded border p-4 ${
                                payment.status === 'failed' ? 'opacity-60' : ''
                            }`}
                        >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <PaymentStatusBadge
                                        status={payment.status}
                                    />
                                    <span className="text-ui-900 font-semibold">
                                        {Money.format(payment.amountCents)}
                                    </span>
                                </div>
                                <span className="text-ui-500 text-xs">
                                    {DateTimeValue.format(
                                        payment.paidAt,
                                        'short'
                                    )}
                                </span>
                            </div>

                            <dl className="grid gap-1 text-sm sm:grid-cols-2">
                                <div className="flex gap-2">
                                    <dt className="text-ui-500">Card</dt>
                                    <dd className="text-ui-700 font-mono">
                                        ···· {payment.cardLast4}
                                    </dd>
                                </div>
                                <div className="flex gap-2">
                                    <dt className="text-ui-500">Cardholder</dt>
                                    <dd className="text-ui-700">
                                        {payment.cardHolder}
                                    </dd>
                                </div>
                                <div className="flex gap-2">
                                    <dt className="text-ui-500">Order</dt>
                                    <dd className="text-ui-700 font-mono text-xs">
                                        <Link
                                            className="hover:underline"
                                            to="/orders"
                                        >
                                            {payment.orderId.slice(0, 8)}…
                                        </Link>
                                    </dd>
                                </div>
                                <div className="flex gap-2">
                                    <dt className="text-ui-500">Payment ID</dt>
                                    <dd className="text-ui-500 font-mono text-xs">
                                        {payment.id.slice(0, 8)}…
                                    </dd>
                                </div>
                            </dl>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

function PaymentStatusBadge({ status }: { status: string }) {
    const styles =
        status === 'success'
            ? 'bg-green-100 text-green-700'
            : 'bg-red-100 text-red-700';
    return (
        <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles}`}
        >
            {status}
        </span>
    );
}
