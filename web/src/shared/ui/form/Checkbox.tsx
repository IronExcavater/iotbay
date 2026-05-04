import type { ReactNode } from 'react';

import clsx from 'clsx';
import { FaCheck } from 'react-icons/fa6';

interface CheckboxProps {
    checked: boolean;
    children: ReactNode;
    className?: string;
    disabled?: boolean;
    onChange: (checked: boolean) => void;
}

export function Checkbox({
    checked,
    children,
    className,
    disabled = false,
    onChange,
}: CheckboxProps) {
    return (
        <button
            aria-checked={checked}
            className={clsx(
                'group text-ui-700 inline-flex items-center gap-2 text-left text-sm outline-none',
                disabled ? 'text-ui-400 cursor-not-allowed' : 'cursor-pointer',
                className
            )}
            disabled={disabled}
            onClick={() => {
                onChange(!checked);
            }}
            role="checkbox"
            type="button"
        >
            <span
                className={clsx(
                    'inline-flex size-4 shrink-0 items-center justify-center rounded border transition-[background-color,border-color,color,box-shadow]',
                    checked
                        ? 'border-ui-900 bg-ui-900 text-ui-0'
                        : 'border-ui-300 bg-ui-0 text-transparent',
                    !disabled &&
                        'group-focus-visible:ring-ui-900 group-focus-visible:ring-2 group-focus-visible:ring-offset-2'
                )}
            >
                <FaCheck aria-hidden="true" className="size-2.5" />
            </span>
            <span>{children}</span>
        </button>
    );
}
