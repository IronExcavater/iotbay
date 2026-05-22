import {
    deleteJson,
    getJson,
    patchJson,
    postJson,
} from '@shared/services/http';

export interface Product {
    id: string;
    name: string;
    code: string;
    priceCents: number;
    description: string;
    mediaUrls: string[];
    type: string;
    stock: number;
    stockStatusMessage: string | null;
    stockStatusTone: 'warning' | 'critical' | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateProductInput {
    name: string;
    code: string;
    mediaUrls: string[];
    priceCents: number;
    stock: number;
    type: string;
}

interface ProductsResponse {
    items: Product[];
}

export const productApi = {
    async list(search = '', signal?: AbortSignal): Promise<Product[]> {
        const query = search.trim();
        const path = query
            ? `/api/products?q=${encodeURIComponent(query)}`
            : '/api/products';

        return (await getJson<ProductsResponse>(path, signal)).items;
    },

    get(productId: string, signal?: AbortSignal): Promise<Product> {
        return getJson<Product>(`/api/products/${productId}`, signal);
    },

    getAdmin(productId: string, signal?: AbortSignal): Promise<Product> {
        return getJson<Product>(`/api/admin/products/${productId}`, signal);
    },

    create(input: CreateProductInput, signal?: AbortSignal): Promise<Product> {
        return postJson<Product, CreateProductInput>(
            '/api/admin/products',
            input,
            signal
        );
    },

    update(
        productId: string,
        input: CreateProductInput,
        signal?: AbortSignal
    ): Promise<Product> {
        return patchJson<Product, CreateProductInput>(
            `/api/admin/products/${productId}`,
            input,
            signal
        );
    },

    remove(productId: string, signal?: AbortSignal): Promise<void> {
        return deleteJson(`/api/admin/products/${productId}`, signal);
    },
};
