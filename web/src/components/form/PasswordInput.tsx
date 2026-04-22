import type { ChangeEventHandler, FocusEventHandler } from 'react';
import clsx from 'clsx';
import { FaEye, FaEyeSlash } from 'react-icons/fa6';

import { Input } from './Input';

export function PasswordInput({
    autoComplete,
    hasError = false,
    maxLength,
    name,
    onBlur,
    onChange,
    onToggle,
    placeholder,
    showPassword,
    value,
}: {
    autoComplete?: string;
    hasError?: boolean;
    maxLength?: number;
    name?: string;
    onBlur?: FocusEventHandler<HTMLInputElement>;
    onChange: ChangeEventHandler<HTMLInputElement>;
    onToggle: () => void;
    placeholder?: string;
    showPassword: boolean;
    value: string;
}) {
    const toggleLabel = showPassword ? 'Hide password' : 'Show password';

    return (
        <div className="relative">
            <Input
                autoComplete={autoComplete}
                className="pr-11"
                hasError={hasError}
                maxLength={maxLength}
                name={name}
                onBlur={onBlur}
                onChange={onChange}
                placeholder={placeholder}
                type={showPassword ? 'text' : 'password'}
                value={value}
            />
            <button
                aria-label={toggleLabel}
                className={clsx(
                    'text-ui-500 hover:text-ui-800 focus-visible:ring-ui-900 absolute top-1/2 right-1.5 inline-flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-inset'
                )}
                onClick={onToggle}
                type="button"
            >
                {showPassword ? (
                    <FaEyeSlash aria-hidden="true" size={20} />
                ) : (
                    <FaEye aria-hidden="true" size={20} />
                )}
            </button>
        </div>
    );
}
