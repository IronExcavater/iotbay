import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'danger' | 'primary' | 'secondary' | 'text';

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
            <span className="inline-flex flex-nowrap items-center justify-center gap-2 whitespace-nowrap">
                {loading ? <ButtonSpinner /> : null}
                {children}
            </span>
        </button>
    );
}

const baseClassName =
    'cursor-pointer rounded text-sm font-medium disabled:cursor-not-allowed';

const variantClassName: Record<ButtonVariant, string> = {
    danger: 'border border-red-200 px-3 py-1.5 text-red-700 hover:bg-red-50',
    primary:
        'bg-slate-900 px-4 py-2 text-white hover:bg-slate-700 disabled:bg-slate-400',
    secondary: 'border border-slate-300 px-3 py-2 hover:bg-slate-100',
    text: 'inline-flex w-fit items-center gap-2 text-slate-600 hover:text-slate-900',
};

function ButtonSpinner() {
    return (
        <svg
            aria-hidden="true"
            className="size-4 animate-spin"
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
