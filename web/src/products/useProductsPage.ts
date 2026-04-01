import { useEffect, useState, type FormEvent } from 'react';

import { toErrorMessage } from '../services/errors';
import { productApi, type CreateProductInput, type Product } from './api';

interface ProductFormValues {
    code: string;
    name: string;
    priceCents: string;
}

const DEFAULT_FORM_VALUES: ProductFormValues = {
    code: '',
    name: '',
    priceCents: '',
};

export function useProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [productsError, setProductsError] = useState<string | null>(null);
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
    const [formValues, setFormValues] = useState(DEFAULT_FORM_VALUES);
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const abortController = new AbortController();

        async function loadProducts() {
            try {
                setProducts(await productApi.list(abortController.signal));
                setProductsError(null);
            } catch (error) {
                if (!abortController.signal.aborted) {
                    setProductsError(toErrorMessage(error));
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

    function setFieldValue(name: keyof ProductFormValues, value: string) {
        setFormValues((current) => ({ ...current, [name]: value }));
        setFormError(null);
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const payload = toProductInput(formValues);
        if (payload === null) {
            setFormError(
                'Enter a name, code, and whole-number price in cents.'
            );
            return;
        }

        setIsSubmitting(true);
        setFormError(null);
        try {
            const createdProduct = await productApi.create(payload);
            setProducts((current) =>
                sortProducts([...current, createdProduct])
            );
            setFormValues(DEFAULT_FORM_VALUES);
        } catch (error) {
            setFormError(toErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    }

    return {
        formError,
        formValues,
        handleSubmit,
        isLoadingProducts,
        isSubmitting,
        products,
        productsError,
        setFieldValue,
    };
}

function toProductInput(values: ProductFormValues): CreateProductInput | null {
    const name = values.name.trim();
    const code = values.code.trim();
    const priceCents = Number.parseInt(values.priceCents.trim(), 10);

    if (!name || !code || Number.isNaN(priceCents)) {
        return null;
    }

    return { code, name, priceCents };
}

function sortProducts(products: Product[]) {
    return products.sort((left, right) => left.code.localeCompare(right.code));
}
