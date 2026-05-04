import type { ReactNode } from 'react';
import clsx from 'clsx';

export function Avatar({
    badge,
    className,
    imageUrl,
    interactive = false,
    name,
    size = 'md',
}: {
    badge?: ReactNode;
    className?: string;
    imageUrl?: string | null;
    interactive?: boolean;
    name: string;
    size?: 'lg' | 'md' | 'sm';
}) {
    const initials = name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');

    const inner = (
        <span
            className={clsx(
                'bg-ui-100 text-ui-700 ring-ui-200 inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1',
                size === 'sm' && 'size-8 text-xs',
                size === 'md' && 'size-10 text-sm',
                size === 'lg' && 'size-14 text-lg',
                interactive &&
                    'cursor-pointer transition-opacity hover:opacity-75',
                !badge && className
            )}
        >
            {imageUrl ? (
                <img
                    alt=""
                    className="h-full w-full object-cover"
                    src={imageUrl}
                />
            ) : (
                <span className="font-semibold">{initials || '?'}</span>
            )}
        </span>
    );

    if (!badge) return inner;

    return (
        <span className={clsx('relative inline-flex shrink-0', className)}>
            {inner}
            {badge}
        </span>
    );
}
