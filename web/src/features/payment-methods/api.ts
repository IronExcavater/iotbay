import { getJson, postJson } from '@shared/services/http';

export interface PaymentMethod {
    id: string;
    type: string;
    cardholderName: string;
    cardLast4: string;
    expiry: string;
}

export interface CreatePaymentMethodInput {
    type: string;
    cardholderName: string;
    cardNumber: string;
    expiry: string;
}

export const paymentMethodApi = {
    list(signal?: AbortSignal): Promise<PaymentMethod[]> {
        return getJson<PaymentMethod[]>('/api/payment-methods', signal);
    },

    create(
        input: CreatePaymentMethodInput,
        signal?: AbortSignal
    ): Promise<PaymentMethod> {
        return postJson<PaymentMethod, CreatePaymentMethodInput>(
            '/api/payment-methods',
            input,
            signal
        );
    },

    async delete(id: string, signal?: AbortSignal): Promise<void> {
        const response = await fetch(`/api/payment-methods/${id}`, {
            method: 'DELETE',
            credentials: 'include',
            signal,
            headers: {
                'x-api-key': import.meta.env.IOTBAY_API_KEY,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to delete payment method');
        }
    },
};
