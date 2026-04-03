import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'danger' | 'primary' | 'secondary' | 'text';

export const textButtonClassName =
    'inline-flex w-fit items-center gap-2 text-sm text-slate-600 underline-offset-4 outline-none transition-colors hover:text-slate-900 hover:underline focus-visible:text-slate-900 focus-visible:underline focus-visible:outline-none';

export function Button({
    children,
    className = '',
    loading = false,
    variant = 'primary',
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
    loading?: boolean;
    variant?: ButtonVariant;
}) {
    return (
        <button
            className={[
                baseClassName,
                variantClassName[variant],
                className,
            ].join(' ')}
            {...props}
        >
            <span
                className={`inline-flex flex-nowrap items-center justify-center gap-2 leading-none whitespace-nowrap ${loading ? 'opacity-0' : 'opacity-100'}`}
            >
                {children}
            </span>
            {loading ? (
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 inline-flex items-center justify-center"
                >
                    <ButtonSpinner />
                </span>
            ) : null}
        </button>
    );
}

const baseClassName =
    'relative cursor-pointer rounded text-sm font-medium disabled:cursor-not-allowed';

const variantClassName: Record<ButtonVariant, string> = {
    danger: 'border border-red-200 px-3 py-1.5 text-red-700 hover:bg-red-50',
    primary:
        'bg-slate-900 px-4 py-2 text-white hover:bg-slate-700 disabled:bg-slate-400',
    secondary: 'border border-slate-300 px-3 py-2 hover:bg-slate-100',
    text: textButtonClassName,
};

function ButtonSpinner() {
    return (
        <svg
            aria-hidden="true"
            className="block size-3.5 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
        >
            <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
            />
            <path
                className="opacity-90"
                d="M22 12a10 10 0 0 0-10-10"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="4"
            />
        </svg>
    );
}
