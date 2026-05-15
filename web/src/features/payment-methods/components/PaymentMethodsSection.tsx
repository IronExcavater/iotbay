import { useEffect, useState } from 'react';
import { FaCreditCard, FaPlus, FaTrashCan } from 'react-icons/fa6';

import {
    paymentMethodApi,
    type PaymentMethod,
    type PaymentMethodInput,
} from '@features/payment-methods/api';
import { Button } from '@shared/ui/form/Button';
import { Field } from '@shared/ui/form/Field';
import { Input } from '@shared/ui/form/Input';
import { useToast } from '@shared/ui/toast/ToastProvider';

interface FormValues {
    type: 'Visa' | 'Mastercard';
    cardholderName: string;
    cardNumber: string;
    expiry: string;
    cvc: string;
}

interface FormErrors {
    cardholderName: string;
    cardNumber: string;
    expiry: string;
    cvc: string;
}

const EMPTY_FORM: FormValues = {
    type: 'Visa',
    cardholderName: '',
    cardNumber: '',
    expiry: '',
    cvc: '',
};

const EMPTY_ERRORS: FormErrors = {
    cardholderName: '',
    cardNumber: '',
    expiry: '',
    cvc: '',
};

function formatCardNumber(value: string, type: 'Visa' | 'Mastercard') {
    let digits = value.replace(/\D/g, '');
    digits = digits.slice(0, type === 'Mastercard' ? 16 : 19);
    let formatted = '';
    for (let i = 0; i < digits.length; i++) {
        if (i > 0 && i % 4 === 0) formatted += ' ';
        formatted += digits[i];
    }
    return formatted;
}

function formatExpiry(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    return digits.length >= 3
        ? digits.slice(0, 2) + '/' + digits.slice(2)
        : digits;
}

function validateForm(values: FormValues): FormErrors {
    const errors = { ...EMPTY_ERRORS };
    const cardDigits = values.cardNumber.replace(/\s/g, '');

    if (!values.cardholderName.trim()) {
        errors.cardholderName = 'Cardholder name is required';
    }

    if (values.type === 'Mastercard') {
        if (cardDigits.length !== 16)
            errors.cardNumber = 'Mastercard must be 16 digits';
    } else {
        if (cardDigits.length < 13 || cardDigits.length > 19)
            errors.cardNumber = 'Visa must be 13 to 19 digits';
    }

    if (!/^\d{2}\/\d{2}$/.test(values.expiry)) {
        errors.expiry = 'Use MM/YY format';
    } else {
        const [mm, yy] = values.expiry.split('/').map(Number);
        const expDate = new Date(2000 + yy, mm);
        if (mm < 1 || mm > 12 || expDate <= new Date()) {
            errors.expiry = 'Card has expired';
        }
    }

    if (values.cvc.length !== 3) {
        errors.cvc = 'CVC must be 3 digits';
    }

    return errors;
}

function hasErrors(errors: FormErrors) {
    return Object.values(errors).some((e) => e.length > 0);
}

export function PaymentMethodsSection() {
    const { showToast } = useToast();
    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<'All' | 'Visa' | 'Mastercard'>(
        'All'
    );

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [values, setValues] = useState<FormValues>(EMPTY_FORM);
    const [errors, setErrors] = useState<FormErrors>(EMPTY_ERRORS);
    const [isSaving, setIsSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        paymentMethodApi
            .list(controller.signal)
            .then(setMethods)
            .catch(() => showToast('Failed to load payment methods'))
            .finally(() => setLoading(false));
        return () => controller.abort();
    }, [showToast]);

    function openAddForm() {
        setEditingId(null);
        setValues(EMPTY_FORM);
        setErrors(EMPTY_ERRORS);
        setIsFormOpen(true);
    }

    function openEditForm(method: PaymentMethod) {
        setEditingId(method.id);
        setValues({
            type: method.type as 'Visa' | 'Mastercard',
            cardholderName: method.cardholderName,
            cardNumber: '',
            expiry: method.expiry,
            cvc: '',
        });
        setErrors(EMPTY_ERRORS);
        setIsFormOpen(true);
    }

    function closeForm() {
        setIsFormOpen(false);
        setEditingId(null);
        setValues(EMPTY_FORM);
        setErrors(EMPTY_ERRORS);
    }

    function setField<K extends keyof FormValues>(
        key: K,
        value: FormValues[K]
    ) {
        setValues((prev) => ({ ...prev, [key]: value }));
    }

    async function handleSave() {
        const nextErrors = validateForm(values);
        setErrors(nextErrors);
        if (hasErrors(nextErrors)) return;

        const input: PaymentMethodInput = {
            type: values.type,
            cardholderName: values.cardholderName,
            cardNumber: values.cardNumber,
            expiry: values.expiry,
        };

        setIsSaving(true);
        try {
            if (editingId) {
                const updated = await paymentMethodApi.update(editingId, input);
                setMethods((prev) =>
                    prev.map((m) => (m.id === editingId ? updated : m))
                );
            } else {
                const created = await paymentMethodApi.create(input);
                setMethods((prev) => [...prev, created]);
            }
            closeForm();
        } catch {
            showToast('Failed to save payment method');
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDelete(id: string) {
        setDeletingId(id);
        try {
            await paymentMethodApi.delete(id);
            setMethods((prev) => prev.filter((m) => m.id !== id));
            if (editingId === id) closeForm();
        } catch {
            showToast('Failed to delete payment method');
        } finally {
            setDeletingId(null);
        }
    }

    const filteredMethods =
        filterType === 'All'
            ? methods
            : methods.filter((m) => m.type === filterType);

    const maxCardLength = values.type === 'Mastercard' ? 19 : 23;

    return (
        <div className="grid gap-4">
            <div className="flex items-center justify-between">
                <h3 className="text-ui-700 text-sm font-semibold tracking-[0.08em] uppercase">
                    Payment methods
                </h3>

                {!isFormOpen && (
                    <Button onClick={openAddForm} type="button" variant="ghost">
                        <FaPlus aria-hidden="true" size={12} />
                        Add
                    </Button>
                )}
            </div>

            <label className="grid gap-1 text-sm">
                <span className="text-ui-700 font-medium">Filter by type</span>
                <select
                    className="border-ui-200 rounded border px-3 py-2 text-sm"
                    onChange={(e) =>
                        setFilterType(
                            e.target.value as 'All' | 'Visa' | 'Mastercard'
                        )
                    }
                    value={filterType}
                >
                    <option>All</option>
                    <option>Visa</option>
                    <option>Mastercard</option>
                </select>
            </label>

            {loading && (
                <p className="text-ui-500 text-sm">Loading payment methods…</p>
            )}

            {!loading && filteredMethods.length === 0 && (
                <p className="text-ui-500 text-sm">No payment methods found.</p>
            )}

            {!loading && filteredMethods.length > 0 && (
                <div className="grid gap-2">
                    {filteredMethods.map((method) => (
                        <div
                            key={method.id}
                            className="border-ui-200 flex items-center gap-3 rounded border px-3 py-2.5"
                        >
                            <FaCreditCard
                                aria-hidden="true"
                                className="text-ui-400 shrink-0"
                                size={18}
                            />

                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium">
                                    {method.type} ending in {method.cardLast4}
                                </p>
                                <p className="text-ui-500 text-xs">
                                    {method.cardholderName} · Expires{' '}
                                    {method.expiry}
                                </p>
                            </div>

                            <div className="flex shrink-0 gap-1">
                                <Button
                                    onClick={() => openEditForm(method)}
                                    type="button"
                                    variant="ghost"
                                >
                                    Edit
                                </Button>
                                <Button
                                    disabled={deletingId === method.id}
                                    onClick={() => void handleDelete(method.id)}
                                    type="button"
                                    variant="ghost"
                                >
                                    <FaTrashCan aria-hidden="true" size={13} />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isFormOpen && (
                <div className="border-ui-200 grid gap-3 rounded border p-3">
                    <p className="text-ui-700 text-sm font-medium">
                        {editingId
                            ? 'Edit payment method'
                            : 'Add payment method'}
                    </p>

                    {editingId && (
                        <p className="text-ui-500 text-xs">
                            Re-enter your card number and CVC to confirm the
                            update.
                        </p>
                    )}

                    <div className="flex gap-2">
                        {(['Visa', 'Mastercard'] as const).map((t) => (
                            <button
                                className={
                                    values.type === t
                                        ? 'bg-ui-900 text-ui-0 rounded-full px-3 py-1 text-sm font-medium'
                                        : 'bg-ui-100 text-ui-700 hover:bg-ui-200 rounded-full px-3 py-1 text-sm font-medium transition-colors'
                                }
                                key={t}
                                onClick={() => {
                                    setField('type', t);
                                    setField('cardNumber', '');
                                }}
                                type="button"
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    <Field
                        error={errors.cardholderName || undefined}
                        label="Cardholder name"
                    >
                        <Input
                            hasError={!!errors.cardholderName}
                            onChange={(e) =>
                                setField('cardholderName', e.target.value)
                            }
                            placeholder="Jane Smith"
                            value={values.cardholderName}
                        />
                    </Field>

                    <Field
                        error={errors.cardNumber || undefined}
                        label="Card number"
                    >
                        <Input
                            hasError={!!errors.cardNumber}
                            maxLength={maxCardLength}
                            onChange={(e) =>
                                setField(
                                    'cardNumber',
                                    formatCardNumber(
                                        e.target.value,
                                        values.type
                                    )
                                )
                            }
                            placeholder="1234 5678 9012 3456"
                            value={values.cardNumber}
                        />
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                        <Field
                            error={errors.expiry || undefined}
                            label="Expiry"
                        >
                            <Input
                                hasError={!!errors.expiry}
                                maxLength={5}
                                onChange={(e) =>
                                    setField(
                                        'expiry',
                                        formatExpiry(e.target.value)
                                    )
                                }
                                placeholder="MM/YY"
                                value={values.expiry}
                            />
                        </Field>

                        <Field error={errors.cvc || undefined} label="CVC">
                            <Input
                                hasError={!!errors.cvc}
                                maxLength={3}
                                onChange={(e) =>
                                    setField(
                                        'cvc',
                                        e.target.value
                                            .replace(/\D/g, '')
                                            .slice(0, 3)
                                    )
                                }
                                placeholder="123"
                                value={values.cvc}
                            />
                        </Field>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            disabled={isSaving}
                            onClick={() => void handleSave()}
                            type="button"
                        >
                            {isSaving
                                ? 'Saving…'
                                : editingId
                                  ? 'Update'
                                  : 'Add payment method'}
                        </Button>

                        <Button
                            onClick={closeForm}
                            type="button"
                            variant="ghost"
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
