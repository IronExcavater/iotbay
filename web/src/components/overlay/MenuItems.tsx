import { type ComponentProps, type ReactNode } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';

import { Tooltip } from '../ui/Tooltip';

// Base styling shared across all menu item variants.
const itemBase =
    'inline-flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition';
const itemDefault = `${itemBase} text-slate-700 hover:bg-slate-100 hover:text-slate-900`;
const itemDanger = `${itemBase} text-red-700 hover:bg-red-50`;

export function MenuPanel({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={clsx('grid gap-1 p-1.5', className)}>{children}</div>
    );
}

export function MenuItem({
    children,
    className,
    disabled,
    title,
    tone = 'default',
    ...props
}: ComponentProps<'button'> & { tone?: 'danger' | 'default' }) {
    const button = (
        <button
            className={clsx(
                tone === 'danger' ? itemDanger : itemDefault,
                // Disabled overrides hover background so the colour doesn't
                // flash on greyed-out items.
                'disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent',
                className
            )}
            disabled={disabled}
            type="button"
            {...props}
        >
            {children}
        </button>
    );

    return title ? (
        <Tooltip className="w-full" label={title}>
            {button}
        </Tooltip>
    ) : (
        button
    );
}

// Navigation link variant — for menu items that route rather than act.
export function MenuLinkItem({
    className,
    ...props
}: ComponentProps<typeof Link>) {
    return <Link className={clsx(itemDefault, className)} {...props} />;
}
