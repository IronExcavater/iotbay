import { forwardRef, type InputHTMLAttributes } from 'react';
import clsx from 'clsx';

function inputStyles(hasError: boolean) {
    return clsx(
        'w-full rounded border px-3 py-2',
        hasError ? 'border-red-500' : 'border-slate-300'
    );
}

export const Input = forwardRef<
    HTMLInputElement,
    InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }
>(function Input({ className, hasError = false, ...props }, ref) {
    return (
        <input
            className={clsx(inputStyles(hasError), className)}
            ref={ref}
            {...props}
        />
    );
});
