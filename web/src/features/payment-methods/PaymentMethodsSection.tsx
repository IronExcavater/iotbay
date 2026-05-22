import { useEffect, useState } from 'react';

import {
    paymentMethodApi,
    type PaymentMethod,
} from '@features/payment-methods/api';
import { Button } from '@shared/ui/form/Button';

export function PaymentMethodsSection() {
    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);

    const [filterType, setFilterType] = useState('All');

    const [type, setType] = useState('Visa');
    const [cardholderName, setCardholderName] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvc, setCvc] = useState('');

    const [editingId, setEditingId] = useState('');

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

    function formatExpiry(value: string) {
        let digits = value.replace(/\D/g, '');
        digits = digits.slice(0, 4);

        if (digits.length >= 3) {
            return digits.slice(0, 2) + '/' + digits.slice(2);
        }

        return digits;
    }

    function formatCvc(value: string) {
        return value.replace(/\D/g, '').slice(0, 3);
    }

    async function loadMethods() {
        const result = await paymentMethodApi.list();
        setMethods(result);
        setLoading(false);
    }

    useEffect(() => {
        loadMethods();
    }, []);

    function clearForm() {
        setEditingId('');
        setType('Visa');
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

    function validateForm() {
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

        setErrors({
            cardholderName: cardholderNameError,
            cardNumber: cardNumberError,
            expiry: expiryError,
            cvc: cvcError,
        });

        if (cardholderNameError.length > 0) {
            return false;
        }

        if (cardNumberError.length > 0) {
            return false;
        }

        if (expiryError.length > 0) {
            return false;
        }

        if (cvcError.length > 0) {
            return false;
        }

        return true;
    }

    async function handleSave() {
        const valid = validateForm();

        if (!valid) {
            return;
        }

        const input = {
            type: type,
            cardholderName: cardholderName,
            cardNumber: cardNumber,
            expiry: expiry,
        };

        if (editingId.length > 0) {
            const updated = await paymentMethodApi.update(editingId, input);

            setMethods((current) =>
                current.map((method) => {
                    if (method.id === editingId) {
                        return updated;
                    }

                    return method;
                })
            );

            clearForm();
            return;
        }

        const created = await paymentMethodApi.create(input);

        setMethods((current) => [...current, created]);

        clearForm();
    }

    async function handleDelete(id: string) {
        await paymentMethodApi.delete(id);

        setMethods((current) => current.filter((method) => method.id !== id));

        if (editingId === id) {
            clearForm();
        }
    }

    function handleEdit(method: PaymentMethod) {
        setEditingId(method.id);
        setType(method.type);
        setCardholderName(method.cardholderName);
        setCardNumber('');
        setExpiry(method.expiry);
        setCvc('');

        setErrors({
            cardholderName: '',
            cardNumber: '',
            expiry: '',
            cvc: '',
        });
    }

    function handleTypeChange(value: string) {
        setType(value);
        setCardNumber('');
    }

    let maxCardLength = 23;

    if (type === 'Mastercard') {
        maxCardLength = 19;
    }

    let filteredMethods = methods;

    if (filterType !== 'All') {
        filteredMethods = methods.filter((method) => {
            return method.type === filterType;
        });
    }

    let saveButtonText = 'Add payment method';

    if (editingId.length > 0) {
        saveButtonText = 'Update payment method';
    }

    return (
        <div className="grid gap-3">
            <h3 className="text-ui-700 text-sm font-semibold tracking-[0.08em] uppercase">
                Payment method
            </h3>

            <div className="grid gap-2">
                <label className="text-ui-700 text-sm font-medium">
                    Search by payment type
                </label>

                <select
                    className="border-ui-200 rounded border px-3 py-2"
                    onChange={(event) => setFilterType(event.target.value)}
                    value={filterType}
                >
                    <option>All</option>
                    <option>Visa</option>
                    <option>Mastercard</option>
                </select>
            </div>

            {loading && (
                <p className="text-ui-500 text-sm">
                    Loading payment methods...
                </p>
            )}

            {!loading && (
                <div className="grid gap-2">
                    {filteredMethods.length === 0 && (
                        <p className="text-ui-500 text-sm">
                            No payment methods found.
                        </p>
                    )}

                    {filteredMethods.map((method) => (
                        <div
                            key={method.id}
                            className="border-ui-200 grid gap-2 rounded border px-3 py-2"
                        >
                            <div className="grid">
                                <span className="text-sm font-medium">
                                    {method.type} ending in {method.cardLast4}
                                </span>

                                <span className="text-ui-500 text-xs">
                                    {method.cardholderName}
                                </span>

                                <span className="text-ui-500 text-xs">
                                    Expiry {method.expiry}
                                </span>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    onClick={() => handleEdit(method)}
                                    type="button"
                                    variant="ghost"
                                >
                                    Edit
                                </Button>

                                <Button
                                    onClick={() => void handleDelete(method.id)}
                                    type="button"
                                    variant="ghost"
                                >
                                    Delete
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="border-ui-200 grid gap-2 rounded border p-3">
                {editingId.length > 0 && (
                    <p className="text-ui-500 text-sm">
                        Editing selected payment method. Enter the card number
                        again before updating.
                    </p>
                )}

                <select
                    className="border-ui-200 rounded border px-3 py-2"
                    onChange={(event) => handleTypeChange(event.target.value)}
                    value={type}
                >
                    <option>Visa</option>
                    <option>Mastercard</option>
                </select>

                <input
                    className={
                        errors.cardholderName.length > 0
                            ? 'rounded border border-red-500 px-3 py-2'
                            : 'border-ui-200 rounded border px-3 py-2'
                    }
                    onChange={(event) => setCardholderName(event.target.value)}
                    placeholder="Cardholder name"
                    value={cardholderName}
                />

                {errors.cardholderName.length > 0 && (
                    <p className="text-sm text-red-400">
                        {errors.cardholderName}
                    </p>
                )}

                <input
                    className={
                        errors.cardNumber.length > 0
                            ? 'rounded border border-red-500 px-3 py-2'
                            : 'border-ui-200 rounded border px-3 py-2'
                    }
                    maxLength={maxCardLength}
                    onChange={(event) =>
                        setCardNumber(formatCardNumber(event.target.value))
                    }
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                />

                {errors.cardNumber.length > 0 && (
                    <p className="text-sm text-red-400">{errors.cardNumber}</p>
                )}

                <input
                    className={
                        errors.expiry.length > 0
                            ? 'rounded border border-red-500 px-3 py-2'
                            : 'border-ui-200 rounded border px-3 py-2'
                    }
                    maxLength={5}
                    onChange={(event) =>
                        setExpiry(formatExpiry(event.target.value))
                    }
                    placeholder="MM/YY"
                    value={expiry}
                />

                {errors.expiry.length > 0 && (
                    <p className="text-sm text-red-400">{errors.expiry}</p>
                )}

                <input
                    className={
                        errors.cvc.length > 0
                            ? 'rounded border border-red-500 px-3 py-2'
                            : 'border-ui-200 rounded border px-3 py-2'
                    }
                    maxLength={3}
                    onChange={(event) => setCvc(formatCvc(event.target.value))}
                    placeholder="CVC"
                    value={cvc}
                />

                {errors.cvc.length > 0 && (
                    <p className="text-sm text-red-400">{errors.cvc}</p>
                )}

                <Button onClick={() => void handleSave()} type="button">
                    {saveButtonText}
                </Button>

                {editingId.length > 0 && (
                    <Button onClick={clearForm} type="button" variant="ghost">
                        Cancel edit
                    </Button>
                )}
            </div>
        </div>
    );
}
