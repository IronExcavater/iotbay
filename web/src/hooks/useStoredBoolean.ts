import { useState } from 'react';

export function useStoredBoolean(key: string, fallback = false) {
    const [value, setValue] = useState(() => {
        if (typeof window === 'undefined') {
            return fallback;
        }

        return window.localStorage.getItem(key) === '1';
    });

    function updateValue(nextValue: boolean) {
        setValue(nextValue);

        if (typeof window !== 'undefined') {
            window.localStorage.setItem(key, nextValue ? '1' : '0');
        }
    }

    return [value, updateValue] as const;
}
