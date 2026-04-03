import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { CountryCode } from 'libphonenumber-js';

import {
    formatPhoneDisplay,
    formatPhoneInput,
    PHONE_COUNTRY_OPTIONS,
    PHONE_NUMBER_MAX_LENGTH,
} from '../../auth/phone';
import { Field } from './Field';
import { inputClassName } from './Input';

interface PhoneFieldProps {
    country: CountryCode;
    error?: string;
    label: ReactNode;
    onBlur?: () => void;
    onCountryChange: (country: CountryCode) => void;
    onNumberChange: (value: string) => void;
    required?: boolean;
    value: string;
}

export function PhoneField({
    country,
    error,
    label,
    onBlur,
    onCountryChange,
    onNumberChange,
    required = false,
    value,
}: PhoneFieldProps) {
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const selectedOption =
        PHONE_COUNTRY_OPTIONS.find((option) => option.code === country) ??
        PHONE_COUNTRY_OPTIONS[0];

    useEffect(() => {
        if (!isFocused || inputRef.current === null) {
            return;
        }

        const length = inputRef.current.value.length;
        inputRef.current.setSelectionRange(length, length);
    }, [country, isFocused]);

    const displayValue = isFocused
        ? formatPhoneInput(value, country)
        : formatPhoneDisplay(value, country);

    return (
        <Field error={error} label={label} required={required}>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,7.25rem)_1fr] sm:items-start">
                <div className="relative">
                    <select
                        aria-label="Phone country code"
                        className={`${inputClassName(false)} cursor-pointer appearance-none pr-9 text-transparent`}
                        onChange={(event) => {
                            const nextCountry = event.target
                                .value as CountryCode;
                            onCountryChange(nextCountry);
                            if (value.trim()) {
                                onNumberChange(
                                    formatPhoneInput(value, nextCountry)
                                );
                            }
                        }}
                        value={country}
                    >
                        {PHONE_COUNTRY_OPTIONS.map((option) => (
                            <option key={option.code} value={option.code}>
                                {option.dropdownLabel}
                            </option>
                        ))}
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-900">
                        {selectedOption.triggerLabel}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500">
                        <ChevronDownIcon />
                    </span>
                </div>

                <input
                    className={inputClassName(Boolean(error))}
                    inputMode="tel"
                    maxLength={PHONE_NUMBER_MAX_LENGTH}
                    onChange={(event) => {
                        onNumberChange(
                            formatPhoneInput(event.target.value, country)
                        );
                    }}
                    onBlur={() => {
                        setIsFocused(false);
                        onBlur?.();
                    }}
                    onFocus={() => {
                        setIsFocused(true);
                    }}
                    placeholder="0412 345 678"
                    ref={inputRef}
                    type="tel"
                    value={displayValue}
                />
            </div>
        </Field>
    );
}

function ChevronDownIcon() {
    return (
        <svg
            aria-hidden="true"
            fill="none"
            height="16"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width="16"
        >
            <path d="m6 9 6 6 6-6" />
        </svg>
    );
}
