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

export interface ProductListParams {
    search?: string;
    type?: string;
    page?: number;
    minPriceCents?: number;
    maxPriceCents?: number;
    inStock?: boolean;
}

export interface ProductsPage {
    items: Product[];
    total: number;
    pages: number;
}

export interface ProductTypeCount {
    type: string;
    count: number;
}

export const productApi = {
    async list(
        params: ProductListParams = {},
        signal?: AbortSignal
    ): Promise<ProductsPage> {
        const query = new URLSearchParams();
        if (params.search?.trim()) query.set('q', params.search.trim());
        if (params.type) query.set('type', params.type);
        if (params.page && params.page > 1)
            query.set('page', String(params.page));
        if (params.minPriceCents !== undefined)
            query.set('minPriceCents', String(params.minPriceCents));
        if (params.maxPriceCents !== undefined)
            query.set('maxPriceCents', String(params.maxPriceCents));
        if (params.inStock) query.set('inStock', 'true');
        const qs = query.toString();
        return getJson<ProductsPage>(
            `/api/products${qs ? `?${qs}` : ''}`,
            signal
        );
    },

    async types(signal?: AbortSignal): Promise<ProductTypeCount[]> {
        const { types } = await getJson<{ types: ProductTypeCount[] }>(
            '/api/products/types',
            signal
        );
        return types;
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
