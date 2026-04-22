import { useMemo } from 'react';

export function useSearchFilter<T>(
    items: T[],
    query: string,
    getSearchValues: (item: T) => Array<string | null | undefined>
) {
    return useMemo(
        () =>
            items.filter((item) =>
                matchesSearchQuery(query, getSearchValues(item))
            ),
        [getSearchValues, items, query]
    );
}

function matchesSearchQuery(
    query: string,
    values: Array<string | null | undefined>
) {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

    if (terms.length === 0) {
        return true;
    }

    const haystack = values
        .filter((value): value is string => Boolean(value))
        .join(' ')
        .toLowerCase();

    return terms.every((term) => haystack.includes(term));
}
