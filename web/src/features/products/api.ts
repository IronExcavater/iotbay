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
    createdAt: string;
    updatedAt: string;
}

export interface CreateProductInput {
    name: string;
    code: string;
    priceCents: number;
}

interface ProductsResponse {
    items: Product[];
}

export const productApi = {
    async list(signal?: AbortSignal): Promise<Product[]> {
        return (await getJson<ProductsResponse>('/api/products', signal)).items;
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
