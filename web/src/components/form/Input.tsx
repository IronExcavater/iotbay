import { forwardRef, type InputHTMLAttributes } from 'react';
import clsx from 'clsx';

type InputSize = 'compact' | 'default';

function inputStyles(hasError: boolean, size: InputSize) {
    return clsx(
        'bg-ui-0 text-ui-900 placeholder:text-ui-500 w-full rounded border-0 px-3 text-sm ring-1 transition-[background-color,box-shadow,color] outline-none disabled:bg-ui-100 disabled:text-ui-500',
        size === 'compact' ? 'h-8' : 'h-10',
        hasError
            ? 'ring-red-500 focus:ring-2 focus:ring-red-500'
            : 'ring-ui-300 focus:ring-2 focus:ring-ui-900'
    );
}

export const Input = forwardRef<
    HTMLInputElement,
    InputHTMLAttributes<HTMLInputElement> & {
        hasError?: boolean;
        inputSize?: InputSize;
    }
>(function Input(
    { className, hasError = false, inputSize = 'default', ...props },
    ref
) {
    return (
        <input
            className={clsx(inputStyles(hasError, inputSize), className)}
            ref={ref}
            {...props}
        />
    );
});
