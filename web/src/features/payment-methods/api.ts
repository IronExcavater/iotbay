import {
    deleteJson,
    getJson,
    patchJson,
    postJson,
} from '@shared/services/http';

export interface PaymentMethod {
    id: string;
    type: string;
    cardholderName: string;
    cardLast4: string;
    expiry: string;
    createdAt: string;
}

export interface PaymentMethodInput {
    type: string;
    cardholderName: string;
    cardNumber: string;
    expiry: string;
}

export const paymentMethodApi = {
    list(): Promise<PaymentMethod[]> {
        return getJson<PaymentMethod[]>('/api/payment-methods');
    },

    create(input: PaymentMethodInput): Promise<PaymentMethod> {
        return postJson<PaymentMethod, PaymentMethodInput>(
            '/api/payment-methods',
            input
        );
    },

    update(id: string, input: PaymentMethodInput): Promise<PaymentMethod> {
        return patchJson<PaymentMethod, PaymentMethodInput>(
            `/api/payment-methods/${id}`,
            input
        );
    },

    delete(id: string): Promise<void> {
        return deleteJson(`/api/payment-methods/${id}`);
    },
};
