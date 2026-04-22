import {
    type ButtonHTMLAttributes,
    type ComponentProps,
    forwardRef,
} from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';

// Shared text-link visual style for both internal and external links.
const textLinkClass =
    'inline-flex w-fit items-center gap-1.5 text-ui-600 underline-offset-4 outline-none transition-colors hover:text-ui-900 hover:underline focus-visible:text-ui-900 focus-visible:underline focus-visible:outline-none';
const textButtonSizeClass = {
    default: 'text-sm',
    small: 'text-xs',
};

type TextButtonSize = keyof typeof textButtonSizeClass;

// Internal navigation link styled as a text link.
export function TextLink({ className, ...props }: ComponentProps<typeof Link>) {
    return (
        <Link
            className={clsx(
                textLinkClass,
                textButtonSizeClass.default,
                className
            )}
            {...props}
        />
    );
}

// External anchor styled as a text link.
export function TextAnchor({ className, ...props }: ComponentProps<'a'>) {
    return (
        <a
            className={clsx(
                textLinkClass,
                textButtonSizeClass.default,
                className
            )}
            {...props}
        />
    );
}

export const TextButton = forwardRef<
    HTMLButtonElement,
    ButtonHTMLAttributes<HTMLButtonElement> & {
        size?: TextButtonSize;
    }
>(function TextButton(
    { className, size = 'default', type = 'button', ...props },
    ref
) {
    return (
        <button
            className={clsx(
                textLinkClass,
                textButtonSizeClass[size],
                className
            )}
            ref={ref}
            type={type}
            {...props}
        />
    );
});
