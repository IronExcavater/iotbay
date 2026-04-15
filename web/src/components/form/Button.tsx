import {
    Children,
    forwardRef,
    isValidElement,
    type ButtonHTMLAttributes,
    type ReactNode,
} from 'react';
import clsx from 'clsx';
import { FaSpinner } from 'react-icons/fa6';

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
    const resolvedTitle = title ?? getButtonText(children);

    return (
        <button
            className={clsx(
                'relative cursor-pointer rounded text-sm font-medium disabled:cursor-not-allowed',
                variantClassName[variant],
                className
            )}
            ref={ref}
            title={resolvedTitle}
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
});

const variantClassName: Record<ButtonVariant, string> = {
    danger: 'border border-red-200 px-3 py-1.5 text-red-700 hover:bg-red-50',
    ghost: 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:text-slate-300',
    primary:
        'bg-slate-900 px-4 py-2 text-white hover:bg-slate-700 disabled:bg-slate-400',
    secondary: 'border border-slate-300 px-3 py-2 hover:bg-slate-100',
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
