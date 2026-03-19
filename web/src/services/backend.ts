export interface HealthStatus {
    status: string;
}

export interface Product {
    id: number;
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

interface ProductListResponse {
    items: Product[];
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(
    /\/$/,
    ''
);

async function request<TResponse, TBody = undefined>(
    path: string,
    options: {
        method?: 'GET' | 'POST';
        body?: TBody;
        signal?: AbortSignal;
    } = {}
): Promise<TResponse> {
    const { method = 'GET', body, signal } = options;
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        signal,
        headers:
            body === undefined
                ? undefined
                : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        const message =
            payload !== null &&
            typeof payload === 'object' &&
            'error' in payload &&
            typeof payload.error === 'string'
                ? payload.error
                : response.statusText ||
                  `Request failed with status ${response.status}`;
        throw new Error(message);
    }

    return payload as TResponse;
}

export const backendService = {
    getHealth(signal?: AbortSignal): Promise<HealthStatus> {
        return request<HealthStatus>('/api/health', { signal });
    },

    async getProducts(signal?: AbortSignal): Promise<Product[]> {
        const response = await request<ProductListResponse>('/api/products', {
            signal,
        });
        return response.items;
    },

    createProduct(
        input: CreateProductInput,
        signal?: AbortSignal
    ): Promise<Product> {
        return request<Product, CreateProductInput>('/api/products', {
            method: 'POST',
            body: input,
            signal,
        });
    },
};
