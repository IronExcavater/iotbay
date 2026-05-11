import { useEffect, useState } from 'react';

import {
    paymentMethodApi,
    type PaymentMethod,
} from '@features/payment-methods/api';
import { Button } from '@shared/ui/form/Button';

export function PaymentMethodsSection() {
    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);

    const [type, setType] = useState('Visa');
    const [cardholderName, setCardholderName] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvc, setCvc] = useState('');

    const [errors, setErrors] = useState({
        cardholderName: '',
        cardNumber: '',
        expiry: '',
        cvc: '',
    });

    function formatCardNumber(value: string) {
        let digits = value.replace(/\D/g, '');

        if (type === 'Mastercard') {
            digits = digits.slice(0, 16);
        } else {
            digits = digits.slice(0, 19);
        }

        let formatted = '';

        for (let i = 0; i < digits.length; i++) {
            if (i > 0 && i % 4 === 0) {
                formatted += ' ';
            }

            formatted += digits[i];
        }

        return formatted;
    }

    function formatCvc(value: string) {
        return value.replace(/\D/g, '').slice(0, 3);
    }

    function formatExpiry(value: string) {
        let digits = value.replace(/\D/g, '');

        digits = digits.slice(0, 4);

        if (digits.length >= 3) {
            return digits.slice(0, 2) + '/' + digits.slice(2);
        }
        return digits;
    }

    async function loadMethods(signal?: AbortSignal) {
        try {
            const result = await paymentMethodApi.list(signal);
            setMethods(result);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        const controller = new AbortController();
        loadMethods(controller.signal);
        return () => controller.abort();
    }, []);

    async function handleCreate() {
        const cardDigits = cardNumber.replace(/\s/g, '');

        let cardholderNameError = '';
        let cardNumberError = '';
        let expiryError = '';
        let cvcError = '';

        if (cardholderName.length === 0) {
            cardholderNameError = 'Cardholder name is required';
        }

        if (type === 'Mastercard') {
            if (cardDigits.length !== 16) {
                cardNumberError = 'Mastercard must be 16 digits';
            }
        } else {
            if (cardDigits.length < 13 || cardDigits.length > 19) {
                cardNumberError = 'Visa must be 13 to 19 digits';
            }
        }

        if (!/^\d{2}\/\d{2}$/.test(expiry)) {
            expiryError = 'Use MM/YY format';
        }

        if (cvc.length !== 3) {
            cvcError = 'CVC must be 3 digits';
        }

        const nextErrors = {
            cardholderName: cardholderNameError,
            cardNumber: cardNumberError,
            expiry: expiryError,
            cvc: cvcError,
        };

        setErrors(nextErrors);

        if (cardholderNameError || cardNumberError || expiryError || cvcError) {
            return;
        }

        const created = await paymentMethodApi.create({
            type,
            cardholderName,
            cardNumber,
            expiry,
        });

        setMethods((current) => [...current, created]);

        setCardholderName('');
        setCardNumber('');
        setExpiry('');
        setCvc('');
        setErrors({
            cardholderName: '',
            cardNumber: '',
            expiry: '',
            cvc: '',
        });
    }

    async function handleDelete(id: string) {
        await paymentMethodApi.delete(id);
        setMethods((current) => current.filter((method) => method.id !== id));
    }

    function handleTypeChange(value: string) {
        setType(value);
        setCardNumber('');
    }

    let maxCardLength = 23;

    if (type === 'Mastercard') {
        maxCardLength = 19;
    }

    return (
        <div className="grid gap-3">
            <h3 className="text-ui-700 text-sm font-semibold tracking-[0.08em] uppercase">
                Payment method
            </h3>

            {loading && (
                <p className="text-ui-500 text-sm">
                    Loading payment methods...
                </p>
            )}

            {!loading && (
                <div className="grid gap-2">
                    {methods.length === 0 && (
                        <p className="text-ui-500 text-sm">
                            No payment methods saved.
                        </p>
                    )}

                    {methods.map((method) => (
                        <div
                            key={method.id}
                            className="border-ui-200 flex items-center justify-between rounded border px-3 py-2"
                        >
                            <div className="grid">
                                <span className="text-sm font-medium">
                                    {method.type} ending in {method.cardLast4}
                                </span>
                                <span className="text-ui-500 text-xs">
                                    {method.cardholderName}
                                </span>
                            </div>

                            <Button
                                onClick={() => void handleDelete(method.id)}
                                type="button"
                                variant="ghost"
                            >
                                Delete
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            <div className="grid gap-2">
                <select
                    className="border-ui-200 rounded border px-3 py-2"
                    onChange={(event) => handleTypeChange(event.target.value)}
                    value={type}
                >
                    <option>Visa</option>
                    <option>Mastercard</option>
                </select>

                <input
                    className={`rounded border px-3 py-2 ${
                        errors.cardholderName
                            ? 'border-red-500'
                            : 'border-ui-200'
                    }`}
                    onChange={(event) => setCardholderName(event.target.value)}
                    placeholder="Cardholder name"
                    value={cardholderName}
                />
                {errors.cardholderName && (
                    <p className="text-sm text-red-400">
                        {errors.cardholderName}
                    </p>
                )}

                <input
                    className={`rounded border px-3 py-2 ${
                        errors.cardNumber ? 'border-red-500' : 'border-ui-200'
                    }`}
                    maxLength={maxCardLength}
                    onChange={(event) =>
                        setCardNumber(formatCardNumber(event.target.value))
                    }
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                />
                {errors.cardNumber && (
                    <p className="text-sm text-red-400">{errors.cardNumber}</p>
                )}

                <input
                    className={`rounded border px-3 py-2 ${
                        errors.expiry ? 'border-red-500' : 'border-ui-200'
                    }`}
                    maxLength={5}
                    onChange={(event) =>
                        setExpiry(formatExpiry(event.target.value))
                    }
                    placeholder="MM/YY"
                    value={expiry}
                />
                {errors.expiry && (
                    <p className="text-sm text-red-400">{errors.expiry}</p>
                )}

                <input
                    className={`rounded border px-3 py-2 ${
                        errors.cvc ? 'border-red-500' : 'border-ui-200'
                    }`}
                    maxLength={3}
                    onChange={(event) => setCvc(formatCvc(event.target.value))}
                    placeholder="CVC"
                    value={cvc}
                />
                {errors.cvc && (
                    <p className="text-sm text-red-400">{errors.cvc}</p>
                )}

                <Button onClick={() => void handleCreate()} type="button">
                    Add payment method
                </Button>
            </div>
        </div>
    );
}
