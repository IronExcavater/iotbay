import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    badge?: ReactNode;
    highContrast?: boolean;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'ghost' | 'overlay';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
    function IconButton(
        {
            badge,
            children,
            className,
            highContrast = false,
            size = 'md',
            variant = 'ghost',
            ...props
        },
        ref
    ) {
        const btn = (
            <button
                className={clsx(
                    'relative inline-flex shrink-0 items-center justify-center rounded-full transition-[background-color,box-shadow,color] outline-none disabled:cursor-not-allowed',
                    size === 'sm' && 'size-8',
                    size === 'md' && 'size-9',
                    size === 'lg' && 'size-10',
                    variant === 'ghost' &&
                        'text-ui-500 hover:bg-ui-100 hover:text-ui-900 disabled:text-ui-300',
                    variant === 'overlay' &&
                        'bg-ui-0/90 text-ui-700 hover:bg-ui-0 border-ui-200 border shadow-sm',
                    highContrast
                        ? 'focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black'
                        : 'focus-visible:ring-ui-900 focus-visible:ring-2',
                    !badge && className
                )}
                ref={ref}
                {...props}
            >
                {children}
            </button>
        );

        if (!badge) return btn;

        return (
            <span className={clsx('relative inline-flex shrink-0', className)}>
                {btn}
                {badge}
            </span>
        );
    }
);
