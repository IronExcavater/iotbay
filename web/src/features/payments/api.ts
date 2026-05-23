import { getJson, postJson } from '@shared/services/http';

export interface Payment {
    id: string;
    orderId: string;
    amountCents: number;
    status: 'success' | 'failed';
    cardLast4: string;
    cardHolder: string;
    paidAt: string;
    paymentMethodId: string | null;
}

export interface PayWithCardInput {
    cardNumber: string;
    cardHolder: string;
    expiry: string;
}

export interface PayWithSavedMethodInput {
    paymentMethodId: string;
}

export type PayOrderInput = PayWithCardInput | PayWithSavedMethodInput;

export const paymentsApi = {
    payOrder(
        orderId: string,
        input: PayOrderInput,
        signal?: AbortSignal
    ): Promise<Payment> {
        return postJson<Payment, PayOrderInput>(
            `/api/orders/${orderId}/pay`,
            input,
            signal
        );
    },

    getPaymentForOrder(
        orderId: string,
        signal?: AbortSignal
    ): Promise<Payment> {
        return getJson<Payment>(`/api/orders/${orderId}/payment`, signal);
    },

    async listMine(signal?: AbortSignal): Promise<Payment[]> {
        return (await getJson<{ items: Payment[] }>('/api/payments', signal))
            .items;
    },
};
