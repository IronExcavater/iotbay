import type { ReactNode } from 'react';
import clsx from 'clsx';

export function FormNotice({
    children,
    tone,
}: {
    children: ReactNode;
    tone: 'error' | 'success';
}) {
    return (
        <p
            className={clsx(
                'text-sm',
                tone === 'error' ? 'text-red-700' : 'text-green-700'
            )}
        >
            {children}
        </p>
    );
}
