import { deleteJsonResponse, getJson, postJson } from '@shared/services/http';

export interface CartItem {
    productId: string;
    quantity: number;
    name: string;
    code: string;
    priceCents: number;
    imageUrl: string;
}

export interface Cart {
    id: string;
    items: CartItem[];
}

export interface AddCartItemInput {
    productId: string;
    quantity: number;
}

export const cartApi = {
    get(signal?: AbortSignal): Promise<Cart> {
        return getJson<Cart>('/api/cart', signal);
    },

    addItem(input: AddCartItemInput, signal?: AbortSignal): Promise<Cart> {
        return postJson<Cart, AddCartItemInput>(
            '/api/cart/items',
            input,
            signal
        );
    },

    removeItem(productId: string, signal?: AbortSignal): Promise<Cart> {
        return deleteJsonResponse<Cart>(`/api/cart/items/${productId}`, signal);
    },

    clearItems(signal?: AbortSignal): Promise<Cart> {
        return deleteJsonResponse<Cart>('/api/cart/items', signal);
    },
};
