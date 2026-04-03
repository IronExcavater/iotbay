import type { ReactNode } from 'react';

export function FormNotice({
    children,
    tone,
}: {
    children: ReactNode;
    tone: 'error' | 'success';
}) {
    return (
        <p
            className={
                tone === 'error'
                    ? 'text-sm text-red-700'
                    : 'text-sm text-emerald-700'
            }
        >
            {children}
        </p>
    );
}
