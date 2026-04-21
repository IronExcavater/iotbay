import type { ChangeEventHandler, FocusEventHandler } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa6';

import { Tooltip } from '../ui/Tooltip';
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
            <Tooltip
                className="absolute top-1/2 right-3 -translate-y-1/2"
                label={toggleLabel}
            >
                <button
                    aria-label={toggleLabel}
                    className="cursor-pointer text-slate-500 hover:text-slate-800"
                    onClick={onToggle}
                    type="button"
                >
                    {showPassword ? (
                        <FaEyeSlash aria-hidden="true" size={20} />
                    ) : (
                        <FaEye aria-hidden="true" size={20} />
                    )}
                </button>
            </Tooltip>
        </div>
    );
}
