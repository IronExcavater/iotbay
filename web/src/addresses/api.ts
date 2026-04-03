import { getJson } from '../services/http';

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
        const search = new URLSearchParams({ q: query });
        if (options.country) {
            search.set('country', options.country);
        }
        if (options.language) {
            search.set('language', options.language);
        }

        const payload = await getJson<{ items: AddressSuggestion[] }>(
            `/api/addresses/suggest?${search.toString()}`,
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
        const search = new URLSearchParams({ id });
        if (options.country) {
            search.set('country', options.country);
        }
        if (options.language) {
            search.set('language', options.language);
        }

        const payload = await getJson<{ address: ResolvedAddress }>(
            `/api/addresses/resolve?${search.toString()}`,
            options.signal
        );
        return payload.address;
    },
};
