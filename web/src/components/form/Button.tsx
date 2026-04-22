import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { FaSpinner } from 'react-icons/fa6';
import { Link, type LinkProps } from 'react-router-dom';

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
        variant = 'primary',
        ...props
    },
    ref
) {
    return (
        <button
            className={buttonClassName(variant, className)}
            ref={ref}
            {...props}
        >
            <span
                className={clsx(
                    'inline-flex flex-nowrap items-center justify-center gap-1.5 leading-5 whitespace-nowrap',
                    loading ? 'opacity-0' : 'opacity-100'
                )}
            >
                {children}
            </span>
            {loading && (
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 inline-flex items-center justify-center"
                >
                    <FaSpinner
                        aria-hidden="true"
                        className="block size-3.5 animate-spin"
                    />
                </span>
            )}
        </button>
    );
});

export function ButtonLink({
    children,
    className = '',
    variant = 'primary',
    ...props
}: LinkProps & {
    children: ReactNode;
    variant?: ButtonVariant;
}) {
    return (
        <Link className={buttonClassName(variant, className)} {...props}>
            {children}
        </Link>
    );
}

const variantClassName: Record<ButtonVariant, string> = {
    danger: 'h-10 px-3 text-red-700 ring-1 ring-red-200 hover:bg-red-50',
    ghost: 'text-ui-500 hover:bg-ui-100 hover:text-ui-900 disabled:text-ui-300',
    primary:
        'bg-ui-950 h-10 px-4 text-ui-0 ring-1 ring-ui-0 hover:bg-ui-800 focus-visible:ring-offset-1 focus-visible:ring-offset-ui-0 disabled:bg-ui-400',
    secondary: 'h-10 px-3 ring-1 ring-ui-300 hover:bg-ui-100',
};

function buttonClassName(variant: ButtonVariant, className: string) {
    return clsx(
        'relative inline-flex cursor-pointer items-center justify-center rounded text-sm font-medium transition-[background-color,box-shadow,color] outline-none focus-visible:ring-2 focus-visible:ring-ui-900 disabled:cursor-not-allowed',
        variantClassName[variant],
        className
    );
}
