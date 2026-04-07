import type { ChangeEventHandler, FocusEventHandler } from 'react';
import clsx from 'clsx';
import { FiEye, FiEyeOff } from 'react-icons/fi';

import { inputClassName } from './Input';

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
            <input
                autoComplete={autoComplete}
                className={clsx(inputClassName(hasError), 'pr-11')}
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
                className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-slate-500 hover:text-slate-800"
                onClick={onToggle}
                title={toggleLabel}
                type="button"
            >
                {showPassword ? (
                    <FiEyeOff aria-hidden="true" size={20} />
                ) : (
                    <FiEye aria-hidden="true" size={20} />
                )}
            </button>
        </div>
    );
}
