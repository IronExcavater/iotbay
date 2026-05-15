import { useEffect, useState, type FormEvent } from 'react';

import { ProductFormDialog } from '@features/products/admin/components/ProductFormDialog';
import { ProductTable } from '@features/products/admin/components/ProductTable';
import { productApi, type Product } from '@features/products/api';
import {
    assessProductForm,
    createProductFormValues,
    toProductErrorState,
    type ProductFieldErrors,
    type ProductFormValues,
} from '@features/products/form';
import { useDebounce } from '@shared/hooks/useDebounce';
import { useDocumentTitle } from '@shared/hooks/useDocumentTitle';
import { useFormattedInput } from '@shared/hooks/useFormattedInput';
import { toErrorMessage } from '@shared/services/http';
import { useToast } from '@shared/ui/toast/ToastProvider';
import { Money } from '@shared/value-objects/Money';
import { ProductCode, ProductName } from '@shared/value-objects/ProductText';

export default function AdminProductsPage() {
    useDocumentTitle('Products');
    const { showToast } = useToast();
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
    const [productsError, setProductsError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const debouncedSearch = useDebounce(search, 350);

    const [formValues, setFormValues] = useState<ProductFormValues>(() =>
        createProductFormValues()
    );
    const [fieldErrors, setFieldErrors] = useState<ProductFieldErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const nameInput = useFormattedInput({
        onChange: (value) => setFormValues((c) => ({ ...c, name: value })),
        value: formValues.name,
        valueType: ProductName,
    });
    const codeInput = useFormattedInput({
        onChange: (value) => setFormValues((c) => ({ ...c, code: value })),
        value: formValues.code,
        valueType: ProductCode,
    });
    const priceInput = useFormattedInput({
        onChange: (value) => setFormValues((c) => ({ ...c, price: value })),
        value: formValues.price,
        valueType: Money,
    });

    useEffect(() => {
        const ac = new AbortController();
        setIsLoadingProducts(true);

        void productApi
            .list(
                { page, search: debouncedSearch.trim() || undefined },
                ac.signal
            )
            .then(({ items, pages }) => {
                if (!ac.signal.aborted) {
                    setProducts(sortProducts(items));
                    setTotalPages(pages);
                    setProductsError(null);
                }
            })
            .catch((error) => {
                if (!ac.signal.aborted) {
                    setProductsError(
                        toErrorMessage(error, 'Unable to load products')
                    );
                }
            })
            .finally(() => {
                if (!ac.signal.aborted) setIsLoadingProducts(false);
            });

        return () => ac.abort();
    }, [debouncedSearch, page]);

    function handleSearchChange(value: string) {
        setSearch(value);
        setPage(1);
    }

    function openCreateForm() {
        setFieldErrors({});
        setFormValues(createProductFormValues());
        setIsFormOpen(true);
    }

    function closeForm() {
        setFieldErrors({});
        setFormValues(createProductFormValues());
        setIsFormOpen(false);
    }

    async function handleDelete(product: Product) {
        if (!window.confirm(`Delete ${product.name}?`)) return;

        try {
            await productApi.remove(product.id);
            setProducts((current) =>
                current.filter((item) => item.id !== product.id)
            );
        } catch (error) {
            setProductsError(toErrorMessage(error, 'Unable to delete product'));
        }
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const assessment = assessProductForm(formValues);
        setFieldErrors(assessment.fieldErrors);
        if (!assessment.payload) return;

        setIsSubmitting(true);
        try {
            const product = await productApi.create(assessment.payload);
            setProducts((current) => sortProducts([...current, product]));
            closeForm();
        } catch (error) {
            const nextState = toProductErrorState(error);
            setFieldErrors(nextState.fieldErrors);
            if (nextState.formError) showToast(nextState.formError);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <>
            <ProductTable
                hasSearch={Boolean(search.trim())}
                isLoading={isLoadingProducts}
                onCreate={openCreateForm}
                onDelete={(product) => {
                    void handleDelete(product);
                }}
                onPageChange={setPage}
                onRefresh={() => setPage((p) => p)}
                page={page}
                products={products}
                productsError={productsError}
                search={search}
                setSearch={handleSearchChange}
                totalPages={totalPages}
            />

            <ProductFormDialog
                codeInput={codeInput}
                fieldErrors={fieldErrors}
                formTitle="Create product"
                isOpen={isFormOpen}
                isSubmitting={isSubmitting}
                nameInput={nameInput}
                onClose={closeForm}
                onMediaUrlsChange={(mediaUrls) => {
                    setFormValues((c) => ({ ...c, mediaUrls }));
                }}
                onStockChange={(stock) => {
                    setFormValues((c) => ({ ...c, stock }));
                }}
                onSubmit={handleSubmit}
                onTypeChange={(type) => {
                    setFormValues((c) => ({ ...c, type }));
                }}
                priceInput={priceInput}
                submitLabel="Create product"
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
