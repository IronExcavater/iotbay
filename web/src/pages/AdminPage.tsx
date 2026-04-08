import { useEffect, useState, type SubmitEvent } from 'react';

import { Button } from '../components/form/Button';
import { Field } from '../components/form/Field';
import { FormNotice } from '../components/form/FormNotice';
import { inputClassName } from '../components/form/Input';
import { PageHeader } from '../components/PageHeader';
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
import { StringValidator } from '../validation/strings';

interface ProductFormValues {
    code: string;
    name: string;
    price: string;
}

type ProductFieldErrors = Partial<Record<keyof ProductFormValues, string>>;

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

function createProductFormValues(): ProductFormValues {
    return {
        code: '',
        name: '',
        price: '',
    };
}

export default function AdminPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
    const [productsError, setProductsError] = useState<string | null>(null);
    const [formValues, setFormValues] = useState<ProductFormValues>(() =>
        createProductFormValues()
    );
    const [fieldErrors, setFieldErrors] = useState<ProductFieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingProductId, setEditingProductId] = useState<string | null>(null);

    const isEditing = Boolean(editingProductId);
    const formTitle = isEditing ? 'Edit product' : 'Create product';
    const submitLabel = isEditing ? 'Save product' : 'Create product';

    useEffect(() => {
        const abortController = new AbortController();

        async function loadProducts() {
            try {
                const items = await productApi.list(abortController.signal);

                if (abortController.signal.aborted)
                    return;

                setProducts(items);
                setProductsError(null);
            } catch (error) {
                if (abortController.signal.aborted)
                    return;

                setProductsError(toErrorMessage(error, 'Unable to load products'));
            } finally {
                if (!abortController.signal.aborted)
                    setIsLoadingProducts(false);
            }
        }

        void loadProducts();

        return () => abortController.abort();
    }, []);

    function updateFormValue<Name extends keyof ProductFormValues>(
        name: Name,
        value: ProductFormValues[Name]
    ) {
        setFormValues((current) => ({
            ...current,
            [name]: value,
        }));
    }

    function resetForm() {
        setEditingProductId(null);
        setFieldErrors({});
        setFormError(null);
        setFormValues(createProductFormValues());
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

    function upsertProduct(product: Product) {
        setProducts((current) =>
            sortProducts(
                editingProductId
                    ? current.map((item) =>
                          item.id === editingProductId ? product : item
                      )
                    : [...current, product]
            )
        );
    }

    function parsePriceOrSetError() {
        const parsedPrice = parseAudInput(formValues.price);

        if (parsedPrice.cents !== null)
            return parsedPrice.cents;

        setFieldErrors((current) => ({
            ...current,
            price: parsedPrice.error ?? 'Price is invalid',
        }));
        return null;
    }

    function renderProductsContent() {
        if (isLoadingProducts)
            return <p className="px-5 py-4 text-slate-500">Loading products</p>;

        if (productsError)
            return <p className="px-5 py-4 text-red-700">{productsError}</p>;

        if (products.length === 0)
            return <p className="px-5 py-4 text-slate-500">No products yet</p>;

        return (
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
                                <td className="px-5 py-3">{product.name}</td>
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
                                                void handleDelete(product);
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
        );
    }

    async function handleDelete(product: Product) {
        if (!window.confirm(`Delete ${product.name}?`))
            return;

        try {
            await productApi.remove(product.id);
            setProducts((current) =>
                current.filter((item) => item.id !== product.id)
            );

            if (editingProductId === product.id)
                resetForm();
        } catch (error) {
            setFormError(toErrorMessage(error, 'Unable to delete product'));
        }
    }

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setFormError(null);

        const nextFieldErrors = validateProductForm(formValues);
        setFieldErrors(nextFieldErrors);

        if (Object.keys(nextFieldErrors).length > 0)
            return;

        const priceCents = parsePriceOrSetError();

        if (priceCents === null)
            return;

        setIsSubmitting(true);

        try {
            const payload = {
                code: formValues.code.trim(),
                name: formValues.name.trim(),
                priceCents,
            };
            const product = editingProductId
                ? await productApi.update(editingProductId, payload)
                : await productApi.create(payload);

            upsertProduct(product);
            resetForm();
        } catch (error) {
            const nextErrors = toProductErrors(error);
            setFieldErrors(nextErrors.fieldErrors);
            setFormError(nextErrors.formError);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className="grid gap-8">
            <PageHeader
                description="Manage the product catalogue"
                title="Staff portal"
            />

            <section className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]">
                <div className="overflow-hidden rounded border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 px-5 py-4">
                        <h2 className="text-lg font-semibold">Products</h2>
                    </div>

                    {renderProductsContent()}
                </div>

                <section className="rounded border border-slate-200 bg-white p-5">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-lg font-semibold">{formTitle}</h2>

                        {isEditing ? (
                            <Button
                                onClick={resetForm}
                                type="button"
                                variant="secondary"
                            >
                                Cancel
                            </Button>
                        ) : null}
                    </div>

                    <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
                        {formError ? (
                            <FormNotice tone="error">{formError}</FormNotice>
                        ) : null}

                        <Field error={fieldErrors.name} label="Name" required>
                            <input
                                className={inputClassName(Boolean(fieldErrors.name))}
                                maxLength={PRODUCT_NAME_MAX_LENGTH}
                                onChange={(event) => {
                                    updateFormValue(
                                        'name',
                                        PRODUCT_NAME_VALIDATOR.formatInput(
                                            event.target.value
                                        )
                                    );
                                }}
                                placeholder="Smart Light Bulb"
                                value={formValues.name}
                            />
                        </Field>

                        <Field error={fieldErrors.code} label="Code" required>
                            <input
                                className={inputClassName(Boolean(fieldErrors.code))}
                                maxLength={PRODUCT_CODE_MAX_LENGTH}
                                onChange={(event) => {
                                    updateFormValue(
                                        'code',
                                        PRODUCT_CODE_VALIDATOR.formatInput(
                                            event.target.value
                                        )
                                    );
                                }}
                                placeholder="SKU-001"
                                value={formValues.code}
                            />
                        </Field>

                        <Field
                            error={fieldErrors.price}
                            hint={
                                fieldErrors.price ? undefined : 'Enter Australian dollars'
                            }
                            label="Price"
                            required
                        >
                            <input
                                className={inputClassName(Boolean(fieldErrors.price))}
                                inputMode="decimal"
                                onChange={(event) => {
                                    updateFormValue(
                                        'price',
                                        formatAudInput(event.target.value)
                                    );
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
                            {submitLabel}
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

    if (parsedPrice.error)
        fieldErrors.price = parsedPrice.error;

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
