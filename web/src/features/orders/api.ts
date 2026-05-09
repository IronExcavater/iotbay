import { getJson, postJson, patchJson } from '@shared/services/http';

export interface OrderItem {
    code: string;
    imageUrl: string;
    name: string;
    priceCents: number;
    productId: string;
    quantity: number;
}

export interface Order {
    id: string;
    createdAt: string;
    items: OrderItem[];
    status: string;
    totalCents: number;
}

export interface CreateOrderInput {
    addressId: string | null;
    items: { productId: string; quantity: number }[];
}

export interface UpdateOrderStatusInput {
    status: string;
}

export const orderApi = {
    list(signal?: AbortSignal): Promise<Order[]> {
        return getJson<Order[]>('/api/orders', signal);
    },

    get(orderId: string, signal?: AbortSignal): Promise<Order> {
        return getJson<Order>(`/api/orders/${orderId}`, signal);
    },

    create(input: CreateOrderInput, signal?: AbortSignal): Promise<Order> {
        return postJson<Order, CreateOrderInput>('/api/orders', input, signal);
    },

    updateStatus(
        orderId: string,
        input: UpdateOrderStatusInput,
        signal?: AbortSignal
    ): Promise<Order> {
        return patchJson<Order, UpdateOrderStatusInput>(
            `/api/orders/${orderId}/status`,
            input,
            signal
        );
    },
};
