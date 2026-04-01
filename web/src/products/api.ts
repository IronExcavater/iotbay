import { getJson, postJson } from '../services/http';

export interface Product {
    id: string;
    name: string;
    code: string;
    priceCents: number;
    createdAt: string;
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

    create(input: CreateProductInput, signal?: AbortSignal): Promise<Product> {
        return postJson<Product, CreateProductInput>(
            '/api/products',
            input,
            signal
        );
    },
};
