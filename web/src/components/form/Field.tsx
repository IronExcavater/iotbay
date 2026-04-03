import type { ReactNode } from 'react';

export function Field({
    children,
    error,
    hint,
    label,
    metaPlacement = 'below',
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
        <span className="text-slate-500">{hint}</span>
    ) : null;

    return (
        <label className="grid gap-1 text-sm">
            <span
                className={
                    metaPlacement === 'inline'
                        ? 'flex items-baseline justify-between gap-4'
                        : undefined
                }
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
