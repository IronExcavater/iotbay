import { getJson, queryString } from '@shared/services/http';

export interface AddressSuggestion {
    id: string;
    label: string;
    subtitle: string;
}

export interface ResolvedAddress {
    addressLineOne: string;
    country: string;
    postcode: string;
    state: string;
    suburb: string;
}

export const addressApi = {
    async suggest(
        query: string,
        options: {
            country?: string;
            language?: string;
            signal?: AbortSignal;
        } = {}
    ): Promise<AddressSuggestion[]> {
        const payload = await getJson<{ items: AddressSuggestion[] }>(
            `/api/addresses/suggest${queryString({
                country: options.country,
                language: options.language,
                q: query,
            })}`,
            options.signal
        );
        return payload.items;
    },

    async resolve(
        id: string,
        options: {
            country?: string;
            language?: string;
            signal?: AbortSignal;
        } = {}
    ): Promise<ResolvedAddress> {
        const payload = await getJson<{ address: ResolvedAddress }>(
            `/api/addresses/resolve${queryString({
                country: options.country,
                id,
                language: options.language,
            })}`,
            options.signal
        );
        return payload.address;
    },
};
