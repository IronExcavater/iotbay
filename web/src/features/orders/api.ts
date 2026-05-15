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

export interface OrderSearchParams {
    orderId?: string;
    date?: string;
}

export interface AdminOrderListParams {
    orderId?: string;
    date?: string;
    page?: number;
}

export interface OrdersPage {
    items: Order[];
    total: number;
    pages: number;
}

export const orderApi = {
    list(params?: OrderSearchParams, signal?: AbortSignal): Promise<Order[]> {
        const searchParams = new URLSearchParams();
        if (params?.orderId) searchParams.set('orderId', params.orderId);
        if (params?.date) searchParams.set('date', params.date);
        const query = searchParams.toString();
        const url = query ? `/api/orders?${query}` : '/api/orders';
        return getJson<Order[]>(url, signal);
    },

    get(orderId: string, signal?: AbortSignal): Promise<Order> {
        return getJson<Order>(`/api/orders/${orderId}`, signal);
    },

    create(input: CreateOrderInput, signal?: AbortSignal): Promise<Order> {
        return postJson<Order, CreateOrderInput>('/api/orders', input, signal);
    },

    listAll(
        params: AdminOrderListParams = {},
        signal?: AbortSignal
    ): Promise<OrdersPage> {
        const query = new URLSearchParams();
        if (params.orderId) query.set('orderId', params.orderId);
        if (params.date) query.set('date', params.date);
        if (params.page && params.page > 1)
            query.set('page', String(params.page));
        const qs = query.toString();
        return getJson<OrdersPage>(
            `/api/staff/all${qs ? `?${qs}` : ''}`,
            signal
        );
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
