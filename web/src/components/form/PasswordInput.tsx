import type { ChangeEventHandler, FocusEventHandler } from 'react';

import { inputClassName } from './Input';

export function PasswordInput({
    autoComplete,
    hasError = false,
    maxLength,
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
    onBlur?: FocusEventHandler<HTMLInputElement>;
    onChange: ChangeEventHandler<HTMLInputElement>;
    onToggle: () => void;
    placeholder?: string;
    showPassword: boolean;
    value: string;
}) {
    return (
        <div className="relative">
            <input
                autoComplete={autoComplete}
                className={`${inputClassName(hasError)} pr-11`}
                maxLength={maxLength}
                onBlur={onBlur}
                onChange={onChange}
                placeholder={placeholder}
                type={showPassword ? 'text' : 'password'}
                value={value}
            />
            <button
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-slate-500 hover:text-slate-800"
                onClick={onToggle}
                type="button"
            >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
        </div>
    );
}

function EyeIcon() {
    return (
        <svg
            aria-hidden="true"
            fill="none"
            height="20"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width="20"
        >
            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

function EyeOffIcon() {
    return (
        <svg
            aria-hidden="true"
            fill="none"
            height="20"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width="20"
        >
            <path d="M3 3l18 18" />
            <path d="M10.6 6.4A10.7 10.7 0 0 1 12 6c6.5 0 10 6 10 6a17.5 17.5 0 0 1-4.1 4.7" />
            <path d="M6.7 6.7C4 8.4 2 12 2 12s3.5 6 10 6c1.7 0 3.2-.4 4.5-1" />
            <path d="M14.1 14.1A3 3 0 0 1 9.9 9.9" />
        </svg>
    );
}
