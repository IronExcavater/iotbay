import {
    Children,
    isValidElement,
    type ButtonHTMLAttributes,
    type ReactNode,
} from 'react';
import clsx from 'clsx';
import { FiLoader } from 'react-icons/fi';

type ButtonVariant = 'danger' | 'primary' | 'secondary' | 'text';

export const textButtonClassName =
    'inline-flex w-fit items-center gap-2 text-sm text-slate-600 underline-offset-4 outline-none transition-colors hover:text-slate-900 hover:underline focus-visible:text-slate-900 focus-visible:underline focus-visible:outline-none';

export function Button({
    children,
    className = '',
    loading = false,
    title,
    variant = 'primary',
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
    loading?: boolean;
    variant?: ButtonVariant;
}) {
    const resolvedTitle = title ?? getButtonText(children);

    return (
        <button
            className={clsx(
                'relative cursor-pointer rounded text-sm font-medium disabled:cursor-not-allowed',
                variantClassName[variant],
                className
            )}
            title={resolvedTitle}
            {...props}
        >
            <span
                className={clsx(
                    'inline-flex flex-nowrap items-center justify-center gap-2 leading-none whitespace-nowrap',
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
                    <FiLoader
                        aria-hidden="true"
                        className="block size-3.5 animate-spin"
                    />
                </span>
            ) : null}
        </button>
    );
}

const variantClassName: Record<ButtonVariant, string> = {
    danger: 'border border-red-200 px-3 py-1.5 text-red-700 hover:bg-red-50',
    primary:
        'bg-slate-900 px-4 py-2 text-white hover:bg-slate-700 disabled:bg-slate-400',
    secondary: 'border border-slate-300 px-3 py-2 hover:bg-slate-100',
    text: textButtonClassName,
};

function getButtonText(children: ReactNode): string | undefined {
    const text = Children.toArray(children)
        .map((child) => {
            if (typeof child === 'string' || typeof child === 'number') {
                return String(child);
            }
            if (isValidElement<{ children?: ReactNode }>(child)) {
                return getButtonText(child.props.children) ?? '';
            }
            return '';
        })
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

    return text || undefined;
}
