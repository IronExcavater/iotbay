import { useEffect, useState, type FormEvent } from 'react';

import { ProductFormDialog } from '../admin/products/components/ProductFormDialog';
import { ProductTable } from '../admin/products/components/ProductTable';
import { useFormattedInput } from '../hooks/useFormattedInput';
import { useSearchFilter } from '../hooks/useSearchFilter';
import { productApi, type Product } from '../products/api';
import {
    assessProductForm,
    createProductFormValues,
    toProductErrorState,
    toProductFormValues,
    type ProductFieldErrors,
    type ProductFormValues,
} from '../products/form';
import { toErrorMessage } from '../services/http';
import { Money } from '../types/Money';
import { ProductCode, ProductName } from '../types/ProductText';

export default function AdminProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
    const [productsError, setProductsError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [formValues, setFormValues] = useState<ProductFormValues>(() =>
        createProductFormValues()
    );
    const [fieldErrors, setFieldErrors] = useState<ProductFieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingProductId, setEditingProductId] = useState<string | null>(
        null
    );
    const [isFormOpen, setIsFormOpen] = useState(false);

    const isEditing = Boolean(editingProductId);
    const formTitle = isEditing ? 'Edit product' : 'Create product';
    const submitLabel = isEditing ? 'Save product' : 'Create product';
    const filteredProducts = useSearchFilter(products, search, (product) => [
        product.code,
        product.name,
    ]);

    const nameInput = useFormattedInput({
        onChange: (value) => {
            setFormValues((current) => ({
                ...current,
                name: value,
            }));
        },
        value: formValues.name,
        valueType: ProductName,
    });
    const codeInput = useFormattedInput({
        onChange: (value) => {
            setFormValues((current) => ({
                ...current,
                code: value,
            }));
        },
        value: formValues.code,
        valueType: ProductCode,
    });
    const priceInput = useFormattedInput({
        onChange: (value) => {
            setFormValues((current) => ({
                ...current,
                price: value,
            }));
        },
        value: formValues.price,
        valueType: Money,
    });

    async function loadProducts(signal?: AbortSignal) {
        setIsLoadingProducts(true);

        try {
            const items = await productApi.list(signal);

            if (!signal?.aborted) {
                setProducts(sortProducts(items));
                setProductsError(null);
            }
        } catch (error) {
            if (!signal?.aborted) {
                setProductsError(
                    toErrorMessage(error, 'Unable to load products')
                );
            }
        } finally {
            if (!signal?.aborted) {
                setIsLoadingProducts(false);
            }
        }
    }

    useEffect(() => {
        const abortController = new AbortController();
        void loadProducts(abortController.signal);
        return () => abortController.abort();
    }, []);

    function closeForm() {
        setEditingProductId(null);
        setFieldErrors({});
        setFormError(null);
        setFormValues(createProductFormValues());
        setIsFormOpen(false);
    }

    function handleCreate() {
        setEditingProductId(null);
        setFieldErrors({});
        setFormError(null);
        setFormValues(createProductFormValues());
        setIsFormOpen(true);
    }

    function handleEdit(product: Product) {
        setEditingProductId(product.id);
        setFieldErrors({});
        setFormError(null);
        setFormValues(toProductFormValues(product));
        setIsFormOpen(true);
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
                closeForm();
            }
        } catch (error) {
            setProductsError(toErrorMessage(error, 'Unable to delete product'));
        }
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
            closeForm();
        } catch (error) {
            const nextState = toProductErrorState(error);
            setFieldErrors(nextState.fieldErrors);
            setFormError(nextState.formError);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <>
            <ProductTable
                hasSearch={Boolean(search.trim())}
                isLoading={isLoadingProducts}
                onCreate={handleCreate}
                onDelete={(product) => {
                    void handleDelete(product);
                }}
                onEdit={handleEdit}
                onRefresh={() => {
                    void loadProducts();
                }}
                products={filteredProducts}
                productsError={productsError}
                search={search}
                setSearch={setSearch}
            />

            <ProductFormDialog
                codeInput={codeInput}
                fieldErrors={fieldErrors}
                formError={formError}
                formTitle={formTitle}
                isOpen={isFormOpen}
                isSubmitting={isSubmitting}
                nameInput={nameInput}
                onClose={closeForm}
                onSubmit={handleSubmit}
                priceInput={priceInput}
                submitLabel={submitLabel}
                values={formValues}
            />
        </>
    );
}

function sortProducts(products: Product[]) {
    return [...products].sort((left, right) =>
        left.code.localeCompare(right.code)
    );
}
