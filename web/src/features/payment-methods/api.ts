export interface PaymentMethod {
    id: string;
    type: string;
    cardholderName: string;
    cardLast4: string;
    expiry: string;
}

export interface PaymentMethodInput {
    type: string;
    cardholderName: string;
    cardNumber: string;
    expiry: string;
}

export const paymentMethodApi = {
    async list(): Promise<PaymentMethod[]> {
        const response = await fetch('/api/payment-methods', {
            credentials: 'include',
            headers: {
                'x-api-key': import.meta.env.IOTBAY_API_KEY,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to load payment methods');
        }

        return response.json();
    },

    async create(input: PaymentMethodInput): Promise<PaymentMethod> {
        const response = await fetch('/api/payment-methods', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': import.meta.env.IOTBAY_API_KEY,
            },
            body: JSON.stringify(input),
        });

        if (!response.ok) {
            throw new Error('Failed to add payment method');
        }

        return response.json();
    },

    async update(
        id: string,
        input: PaymentMethodInput
    ): Promise<PaymentMethod> {
        const response = await fetch('/api/payment-methods/' + id, {
            method: 'PATCH',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': import.meta.env.IOTBAY_API_KEY,
            },
            body: JSON.stringify(input),
        });

        if (!response.ok) {
            throw new Error('Failed to update payment method');
        }

        return response.json();
    },

    async delete(id: string): Promise<void> {
        const response = await fetch('/api/payment-methods/' + id, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'x-api-key': import.meta.env.IOTBAY_API_KEY,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to delete payment method');
        }
    },
};
