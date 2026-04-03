import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';
import { Button } from '../components/form/Button';
import { Field } from '../components/form/Field';
import { FormNotice } from '../components/form/FormNotice';
import { inputClassName } from '../components/form/Input';
import { useEnterSubmit } from '../components/form/useEnterSubmit';
import { formatDateTime } from '../formatting/dateTime';
import {
    formatAud,
    formatAudInput,
    parseAudInput,
    PRODUCT_CODE_MAX_LENGTH,
    PRODUCT_NAME_MAX_LENGTH,
} from '../formatting/money';
import { productApi, type Product } from '../products/api';
import {
    backendErrorMessage,
    resolveBackendError,
    toErrorMessage,
} from '../services/http';
import { StringValidator } from '../validation/core';

interface ProductFormValues {
    code: string;
    name: string;
    price: string;
}

type ProductFieldErrors = Partial<Record<keyof ProductFormValues, string>>;

const DEFAULT_VALUES: ProductFormValues = {
    code: '',
    name: '',
    price: '',
};

const PRODUCT_NAME_VALIDATOR = new StringValidator({
    fieldName: 'Name',
    required: true,
    maxLength: PRODUCT_NAME_MAX_LENGTH,
    asciiOnly: true,
    printableAsciiOnly: true,
});

const PRODUCT_CODE_VALIDATOR = new StringValidator({
    fieldName: 'Code',
    required: true,
    maxLength: PRODUCT_CODE_MAX_LENGTH,
    asciiOnly: true,
    printableAsciiOnly: true,
    uppercase: true,
});

export default function AdminPage() {
    const formRef = useRef<HTMLFormElement | null>(null);
    const { isAuthenticated, isLoading, logout, user } = useAuth();
    const [isClearingNonStaffSession, setIsClearingNonStaffSession] =
        useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
    const [productsError, setProductsError] = useState<string | null>(null);
    const [formValues, setFormValues] =
        useState<ProductFormValues>(DEFAULT_VALUES);
    const [fieldErrors, setFieldErrors] = useState<ProductFieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingProductId, setEditingProductId] = useState<string | null>(
        null
    );
    const enterSubmit = useEnterSubmit({
        canSubmit: () =>
            !isSubmitting &&
            Object.values(validateProductForm(formValues)).every(
                (error) => !error
            ),
        formRef,
    });

    useEffect(() => {
        const abortController = new AbortController();

        async function loadProducts() {
            try {
                setProducts(await productApi.list(abortController.signal));
                setProductsError(null);
            } catch (error) {
                if (!abortController.signal.aborted) {
                    setProductsError(
                        toErrorMessage(error, 'Unable to load products')
                    );
                }
            } finally {
                if (!abortController.signal.aborted) {
                    setIsLoadingProducts(false);
                }
            }
        }

        void loadProducts();
        return () => abortController.abort();
    }, []);

    useEffect(() => {
        if (
            isLoading ||
            !isAuthenticated ||
            !user ||
            user.userType !== 'staff' ||
            !user.permission ||
            isClearingNonStaffSession
        ) {
            return;
        }

        setIsClearingNonStaffSession(true);
        void logout().finally(() => {
            setIsClearingNonStaffSession(false);
        });
    }, [isAuthenticated, isClearingNonStaffSession, isLoading, logout, user]);

    if (!isLoading && !isAuthenticated && !isClearingNonStaffSession) {
        return (
            <Navigate
                replace
                to="/auth?mode=signin&userType=staff&next=/admin"
            />
        );
    }

    if (
        !isLoading &&
        isAuthenticated &&
        (user?.userType !== 'staff' || !user.permission)
    ) {
        return (
            <p className="py-8 text-slate-500">Redirecting to staff sign in</p>
        );
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const nextFieldErrors = validateProductForm(formValues);
        setFieldErrors(nextFieldErrors);
        setFormError(null);
        if (Object.keys(nextFieldErrors).length > 0) {
            return;
        }

        const parsedPrice = parseAudInput(formValues.price);
        if (parsedPrice.cents === null) {
            setFieldErrors((current) => ({
                ...current,
                price: parsedPrice.error ?? 'Price is invalid',
            }));
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                code: formValues.code.trim(),
                name: formValues.name.trim(),
                priceCents: parsedPrice.cents,
            };
            const product = editingProductId
                ? await productApi.update(editingProductId, payload)
                : await productApi.create(payload);

            setProducts((current) =>
                sortProducts(
                    editingProductId
                        ? current.map((item) =>
                              item.id === editingProductId ? product : item
                          )
                        : [...current, product]
                )
            );
            resetForm();
        } catch (error) {
            const nextErrors = toProductErrors(error);
            setFieldErrors(nextErrors.fieldErrors);
            setFormError(nextErrors.formError);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDelete(product: Product) {
        if (!window.confirm(`Delete ${product.name}?`)) {
            return;
        }

        try {
            await productApi.remove(product.id);
            setProducts((current) =>
                current.filter((item) => item.id !== product.id)
            );
            if (editingProductId === product.id) {
                resetForm();
            }
        } catch (error) {
            setFormError(toErrorMessage(error, 'Unable to delete product'));
        }
    }

    function handleEdit(product: Product) {
        setEditingProductId(product.id);
        setFieldErrors({});
        setFormError(null);
        setFormValues({
            code: product.code,
            name: product.name,
            price: (product.priceCents / 100).toFixed(2),
        });
    }

    function resetForm() {
        setEditingProductId(null);
        setFieldErrors({});
        setFormError(null);
        setFormValues(DEFAULT_VALUES);
    }

    return (
        <section className="grid gap-8">
            <header className="grid gap-2">
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    Staff portal
                </h1>
                <p className="text-sm text-slate-600">
                    Manage the product catalogue
                </p>
            </header>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]">
                <div className="overflow-hidden rounded border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 px-5 py-4">
                        <h2 className="text-lg font-semibold">Products</h2>
                    </div>

                    {isLoadingProducts ? (
                        <p className="px-5 py-4 text-slate-500">
                            Loading products
                        </p>
                    ) : productsError ? (
                        <p className="px-5 py-4 text-red-700">
                            {productsError}
                        </p>
                    ) : products.length === 0 ? (
                        <p className="px-5 py-4 text-slate-500">
                            No products yet
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-sm">
                                <thead className="border-b border-slate-200 bg-slate-100 text-xs font-semibold tracking-[0.12em] text-slate-700 uppercase">
                                    <tr>
                                        <th className="px-5 py-3">Code</th>
                                        <th className="px-5 py-3">Name</th>
                                        <th className="px-5 py-3">Price</th>
                                        <th className="px-5 py-3">Updated</th>
                                        <th className="px-5 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map((product) => (
                                        <tr
                                            className="border-t border-slate-200 align-top"
                                            key={product.id}
                                        >
                                            <td className="px-5 py-3 font-mono text-xs text-slate-600">
                                                {product.code}
                                            </td>
                                            <td className="px-5 py-3">
                                                {product.name}
                                            </td>
                                            <td className="px-5 py-3">
                                                {formatAud(product.priceCents)}
                                            </td>
                                            <td
                                                className="px-5 py-3 text-slate-500"
                                                title={formatDateTime(
                                                    product.updatedAt,
                                                    'long'
                                                )}
                                            >
                                                {formatDateTime(
                                                    product.updatedAt,
                                                    'relative'
                                                )}
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex gap-2">
                                                    <Button
                                                        onClick={() => {
                                                            handleEdit(product);
                                                        }}
                                                        type="button"
                                                        variant="secondary"
                                                    >
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        onClick={() => {
                                                            void handleDelete(
                                                                product
                                                            );
                                                        }}
                                                        type="button"
                                                        variant="danger"
                                                    >
                                                        Delete
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <section className="rounded border border-slate-200 bg-white p-5">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-lg font-semibold">
                            {editingProductId
                                ? 'Edit product'
                                : 'Create product'}
                        </h2>
                        {editingProductId ? (
                            <Button
                                onClick={resetForm}
                                type="button"
                                variant="secondary"
                            >
                                Cancel
                            </Button>
                        ) : null}
                    </div>

                    <form
                        className="mt-5 grid gap-4"
                        onKeyDown={enterSubmit.onKeyDown}
                        onSubmit={handleSubmit}
                        ref={formRef}
                    >
                        {formError ? (
                            <FormNotice tone="error">{formError}</FormNotice>
                        ) : null}

                        <Field error={fieldErrors.name} label="Name" required>
                            <input
                                className={inputClassName(
                                    Boolean(fieldErrors.name)
                                )}
                                maxLength={PRODUCT_NAME_MAX_LENGTH}
                                onChange={(event) => {
                                    setFormValues((current) => ({
                                        ...current,
                                        name: PRODUCT_NAME_VALIDATOR.formatInput(
                                            event.target.value
                                        ),
                                    }));
                                }}
                                placeholder="Smart Light Bulb"
                                value={formValues.name}
                            />
                        </Field>

                        <Field error={fieldErrors.code} label="Code" required>
                            <input
                                className={inputClassName(
                                    Boolean(fieldErrors.code)
                                )}
                                maxLength={PRODUCT_CODE_MAX_LENGTH}
                                onChange={(event) => {
                                    setFormValues((current) => ({
                                        ...current,
                                        code: PRODUCT_CODE_VALIDATOR.formatInput(
                                            event.target.value
                                        ),
                                    }));
                                }}
                                placeholder="SKU-001"
                                value={formValues.code}
                            />
                        </Field>

                        <Field
                            error={fieldErrors.price}
                            hint={
                                !fieldErrors.price
                                    ? 'Enter Australian dollars'
                                    : undefined
                            }
                            label="Price"
                            required
                        >
                            <input
                                className={inputClassName(
                                    Boolean(fieldErrors.price)
                                )}
                                inputMode="decimal"
                                onChange={(event) => {
                                    setFormValues((current) => ({
                                        ...current,
                                        price: formatAudInput(
                                            event.target.value
                                        ),
                                    }));
                                }}
                                placeholder="49.95"
                                value={formValues.price}
                            />
                        </Field>

                        <Button
                            disabled={isSubmitting}
                            loading={isSubmitting}
                            type="submit"
                            variant="primary"
                        >
                            {editingProductId
                                ? 'Save product'
                                : 'Create product'}
                        </Button>
                    </form>
                </section>
            </section>
        </section>
    );
}

function sortProducts(products: Product[]) {
    return [...products].sort((left, right) =>
        left.code.localeCompare(right.code)
    );
}

function validateProductForm(values: ProductFormValues) {
    const fieldErrors: ProductFieldErrors = {};

    fieldErrors.name = PRODUCT_NAME_VALIDATOR.tryValidate(
        values.name
    ).error?.message;
    fieldErrors.code = PRODUCT_CODE_VALIDATOR.tryValidate(
        values.code
    ).error?.message;

    const parsedPrice = parseAudInput(values.price);
    if (parsedPrice.error) {
        fieldErrors.price = parsedPrice.error;
    }

    return fieldErrors;
}

function toProductErrors(error: unknown) {
    const fieldErrors: ProductFieldErrors = {};

    return resolveBackendError<{
        fieldErrors: ProductFieldErrors;
        formError: string | null;
    }>(
        error,
        {
            PRODUCT_CODE_EXISTS: (backendError) => ({
                fieldErrors: {
                    ...fieldErrors,
                    code: backendErrorMessage(backendError.code),
                },
                formError: null,
            }),
            PRODUCT_CODE_INVALID: (backendError) => ({
                fieldErrors: {
                    ...fieldErrors,
                    code: backendErrorMessage(backendError.code),
                },
                formError: null,
            }),
            PRODUCT_CODE_REQUIRED: (backendError) => ({
                fieldErrors: {
                    ...fieldErrors,
                    code: backendErrorMessage(backendError.code),
                },
                formError: null,
            }),
            PRODUCT_CODE_TOO_LONG: (backendError) => ({
                fieldErrors: {
                    ...fieldErrors,
                    code: backendErrorMessage(backendError.code),
                },
                formError: null,
            }),
            PRODUCT_ID_INVALID: (backendError) => ({
                fieldErrors,
                formError: backendErrorMessage(backendError.code),
            }),
            PRODUCT_NAME_INVALID: (backendError) => ({
                fieldErrors: {
                    ...fieldErrors,
                    name: backendErrorMessage(backendError.code),
                },
                formError: null,
            }),
            PRODUCT_NAME_REQUIRED: (backendError) => ({
                fieldErrors: {
                    ...fieldErrors,
                    name: backendErrorMessage(backendError.code),
                },
                formError: null,
            }),
            PRODUCT_NAME_TOO_LONG: (backendError) => ({
                fieldErrors: {
                    ...fieldErrors,
                    name: backendErrorMessage(backendError.code),
                },
                formError: null,
            }),
            PRODUCT_NOT_FOUND: (backendError) => ({
                fieldErrors,
                formError: backendErrorMessage(backendError.code),
            }),
            PRODUCT_PRICE_INVALID: (backendError) => ({
                fieldErrors: {
                    ...fieldErrors,
                    price: backendErrorMessage(backendError.code),
                },
                formError: null,
            }),
            PRODUCT_PRICE_TOO_LARGE: (backendError) => ({
                fieldErrors: {
                    ...fieldErrors,
                    price: backendErrorMessage(backendError.code),
                },
                formError: null,
            }),
            STAFF_ACCOUNT_REQUIRED: (backendError) => ({
                fieldErrors,
                formError: backendErrorMessage(backendError.code),
            }),
            STAFF_PERMISSION_REQUIRED: (backendError) => ({
                fieldErrors,
                formError: backendErrorMessage(backendError.code),
            }),
        },
        (formError) => ({ fieldErrors, formError })
    );
}
