import { useEffect, useState, type SubmitEvent } from 'react';

import { Button } from '../components/form/Button';
import { Field } from '../components/form/Field';
import { FormNotice } from '../components/form/FormNotice';
import { inputClassName } from '../components/form/Input';
import { formatDateTime } from '../formatting/dateTime';
import { formatAud } from '../formatting/money';
import { productApi, type Product } from '../products/api';
import {
    assessProductForm,
    createProductFormValues,
    formatProductField,
    toProductErrorState,
    toProductFormValues,
    type ProductFieldErrors,
    type ProductFormValues,
} from '../products/form';
import { toErrorMessage } from '../services/http';

export default function AdminProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
    const [productsError, setProductsError] = useState<string | null>(null);
    const [formValues, setFormValues] = useState<ProductFormValues>(() =>
        createProductFormValues()
    );
    const [fieldErrors, setFieldErrors] = useState<ProductFieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingProductId, setEditingProductId] = useState<string | null>(
        null
    );

    const isEditing = Boolean(editingProductId);
    const formTitle = isEditing ? 'Edit product' : 'Create product';
    const submitLabel = isEditing ? 'Save product' : 'Create product';

    useEffect(() => {
        const abortController = new AbortController();

        async function loadProducts() {
            try {
                const items = await productApi.list(abortController.signal);

                if (!abortController.signal.aborted) {
                    setProducts(sortProducts(items));
                    setProductsError(null);
                }
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

    function updateFormValue<Name extends keyof ProductFormValues>(
        name: Name,
        value: ProductFormValues[Name]
    ) {
        setFormValues((current) => ({
            ...current,
            [name]: formatProductField(name, value),
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
        setFormValues(toProductFormValues(product));
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

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setFormError(null);

        const assessment = assessProductForm(formValues);
        setFieldErrors(assessment.fieldErrors);

        if (!assessment.payload) {
            return;
        }

        setIsSubmitting(true);

        try {
            const product = editingProductId
                ? await productApi.update(editingProductId, assessment.payload)
                : await productApi.create(assessment.payload);

            upsertProduct(product);
            resetForm();
        } catch (error) {
            const nextState = toProductErrorState(error);
            setFieldErrors(nextState.fieldErrors);
            setFormError(nextState.formError);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]">
            <div className="overflow-hidden rounded border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-5 py-4">
                    <h2 className="text-lg font-semibold">Products</h2>
                    <p className="mt-1 text-sm text-slate-600">
                        Browse and maintain the product catalogue.
                    </p>
                </div>

                {renderProductsContent({
                    isLoadingProducts,
                    onDelete: handleDelete,
                    onEdit: handleEdit,
                    products,
                    productsError,
                })}
            </div>

            <section className="rounded border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                    <div className="grid gap-1">
                        <h2 className="text-lg font-semibold">{formTitle}</h2>
                        <p className="text-sm text-slate-600">
                            Save catalogue changes in Australian dollars.
                        </p>
                    </div>

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
                            className={inputClassName(
                                Boolean(fieldErrors.name)
                            )}
                            onChange={(event) => {
                                updateFormValue('name', event.target.value);
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
                            onChange={(event) => {
                                updateFormValue('code', event.target.value);
                            }}
                            placeholder="SKU-001"
                            value={formValues.code}
                        />
                    </Field>

                    <Field
                        error={fieldErrors.price}
                        hint={
                            fieldErrors.price
                                ? undefined
                                : 'Enter Australian dollars'
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
                                updateFormValue('price', event.target.value);
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
    );
}

function renderProductsContent({
    isLoadingProducts,
    onDelete,
    onEdit,
    products,
    productsError,
}: {
    isLoadingProducts: boolean;
    onDelete: (product: Product) => Promise<void>;
    onEdit: (product: Product) => void;
    products: Product[];
    productsError: string | null;
}) {
    if (isLoadingProducts) {
        return <p className="px-5 py-4 text-slate-500">Loading products</p>;
    }

    if (productsError) {
        return <p className="px-5 py-4 text-red-700">{productsError}</p>;
    }

    if (products.length === 0) {
        return <p className="px-5 py-4 text-slate-500">No products yet</p>;
    }

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
                                {formatDateTime(product.updatedAt, 'relative')}
                            </td>
                            <td className="px-5 py-3">
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => {
                                            onEdit(product);
                                        }}
                                        type="button"
                                        variant="secondary"
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            void onDelete(product);
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

function sortProducts(products: Product[]) {
    return [...products].sort((left, right) =>
        left.code.localeCompare(right.code)
    );
}
