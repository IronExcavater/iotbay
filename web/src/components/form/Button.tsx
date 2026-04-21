import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { FaSpinner } from 'react-icons/fa6';

import { Tooltip } from '../ui/Tooltip';

type ButtonVariant = 'danger' | 'ghost' | 'primary' | 'secondary';

export const Button = forwardRef<
    HTMLButtonElement,
    ButtonHTMLAttributes<HTMLButtonElement> & {
        children: ReactNode;
        loading?: boolean;
        variant?: ButtonVariant;
    }
>(function Button(
    {
        children,
        className = '',
        loading = false,
        title,
        variant = 'primary',
        ...props
    },
    ref
) {
    const button = (
        <button
            className={clsx(
                'relative cursor-pointer rounded text-sm font-medium disabled:cursor-not-allowed',
                variantClassName[variant],
                className
            )}
            ref={ref}
            {...props}
        >
            <span
                className={clsx(
                    'inline-flex flex-nowrap items-center justify-center gap-1.5 leading-none whitespace-nowrap',
                    loading ? 'opacity-0' : 'opacity-100'
                )}
            >
                {children}
            </span>
            {loading ? (
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 inline-flex items-center justify-center"
                >
                    <FaSpinner
                        aria-hidden="true"
                        className="block size-3.5 animate-spin"
                    />
                </span>
            ) : null}
        </button>
    );

    return title ? <Tooltip label={title}>{button}</Tooltip> : button;
});

const variantClassName: Record<ButtonVariant, string> = {
    danger: 'border border-red-200 px-3 py-1.5 text-red-700 hover:bg-red-50',
    ghost: 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:text-slate-300',
    primary:
        'bg-primary px-4 py-2 text-primary-fg hover:bg-primary-hover disabled:bg-slate-400',
    secondary: 'border border-slate-300 px-3 py-2 hover:bg-slate-100',
};
