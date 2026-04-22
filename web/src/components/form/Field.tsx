import type { ReactNode } from 'react';
import clsx from 'clsx';

export function Field({
    children,
    error,
    hint,
    label,
    metaPlacement = 'inline',
    required = false,
}: {
    children: ReactNode;
    error?: ReactNode;
    hint?: ReactNode;
    label: ReactNode;
    metaPlacement?: 'below' | 'inline';
    required?: boolean;
}) {
    const meta = error ? (
        <span className="text-red-700">{error}</span>
    ) : hint ? (
        <span className="text-ui-500">{hint}</span>
    ) : null;

    return (
        <label className="grid gap-1 text-sm">
            <span
                className={clsx(
                    metaPlacement === 'inline' &&
                        'flex items-baseline justify-between gap-4'
                )}
            >
                <span>
                    {label}
                    {required ? <span className="text-red-700"> *</span> : null}
                </span>
                {metaPlacement === 'inline' ? meta : null}
            </span>
            {children}
            {metaPlacement === 'below' ? meta : null}
        </label>
    );
}
