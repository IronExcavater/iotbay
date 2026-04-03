import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
    const [isCountryMenuOpen, setIsCountryMenuOpen] = useState(false);
    const [countrySearch, setCountrySearch] = useState('');
    const inputRef = useRef<HTMLInputElement | null>(null);
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const selectedOption =
        PHONE_COUNTRY_OPTIONS.find((option) => option.code === country) ??
        PHONE_COUNTRY_OPTIONS[0];
    const filteredOptions = useMemo(() => {
        const normalizedQuery = countrySearch.trim().toLowerCase();
        if (!normalizedQuery) {
            return PHONE_COUNTRY_OPTIONS;
        }

        return PHONE_COUNTRY_OPTIONS.filter((option) =>
            [option.code, option.name, option.dialCode, option.dropdownLabel]
                .join(' ')
                .toLowerCase()
                .includes(normalizedQuery)
        );
    }, [countrySearch]);

    useEffect(() => {
        if (!isFocused || inputRef.current === null) {
            return;
        }

        const length = inputRef.current.value.length;
        inputRef.current.setSelectionRange(length, length);
    }, [country, isFocused]);

    useEffect(() => {
        if (!isCountryMenuOpen) {
            setCountrySearch('');
            return;
        }

        searchInputRef.current?.focus();
    }, [isCountryMenuOpen]);

    useEffect(() => {
        function handlePointerDown(event: MouseEvent) {
            if (!rootRef.current?.contains(event.target as Node)) {
                setIsCountryMenuOpen(false);
            }
        }

        document.addEventListener('mousedown', handlePointerDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
        };
    }, []);

    const displayValue = isFocused
        ? formatPhoneInput(value, country)
        : formatPhoneDisplay(value, country);

    return (
        <Field error={error} label={label} required={required}>
            <div
                className="grid gap-3 sm:grid-cols-[minmax(0,7.25rem)_1fr] sm:items-start"
                ref={rootRef}
            >
                <div className="relative">
                    <button
                        aria-expanded={isCountryMenuOpen}
                        aria-haspopup="listbox"
                        className={`${inputClassName(false)} flex cursor-pointer items-center justify-between gap-2 pr-3 text-left`}
                        onClick={() => {
                            setIsCountryMenuOpen((current) => !current);
                        }}
                        type="button"
                    >
                        <span className="truncate text-sm text-slate-900">
                            {selectedOption.triggerLabel}
                        </span>
                        <span
                            className={`shrink-0 text-slate-500 transition-transform duration-200 ${isCountryMenuOpen ? 'rotate-180' : ''}`}
                        >
                            <ChevronDownIcon />
                        </span>
                    </button>
                    {isCountryMenuOpen ? (
                        <div className="absolute z-20 mt-1 w-72 overflow-hidden rounded border border-slate-200 bg-white shadow-lg">
                            <div className="sticky top-0 border-b border-slate-200 bg-white p-2">
                                <div className="relative">
                                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                                        <SearchIcon />
                                    </span>
                                    <input
                                        className={`${inputClassName(false)} py-2 pl-9`}
                                        onChange={(event) => {
                                            setCountrySearch(
                                                event.target.value
                                            );
                                        }}
                                        placeholder="Search country"
                                        ref={searchInputRef}
                                        value={countrySearch}
                                    />
                                </div>
                            </div>
                            <div
                                className="max-h-64 overflow-y-auto py-1"
                                role="listbox"
                            >
                                {filteredOptions.map((option) => (
                                    <button
                                        className={`flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50 ${option.code === country ? 'bg-slate-50' : ''}`}
                                        key={option.code}
                                        onMouseDown={(event) => {
                                            event.preventDefault();
                                            setIsCountryMenuOpen(false);
                                            onCountryChange(option.code);
                                            if (value.trim()) {
                                                onNumberChange(
                                                    formatPhoneInput(
                                                        value,
                                                        option.code
                                                    )
                                                );
                                            }
                                        }}
                                        role="option"
                                        type="button"
                                    >
                                        <span className="truncate text-slate-900">
                                            {option.dropdownLabel}
                                        </span>
                                        <span className="shrink-0 text-slate-500">
                                            {option.code}
                                        </span>
                                    </button>
                                ))}
                                {filteredOptions.length === 0 ? (
                                    <div className="px-3 py-2 text-sm text-slate-500">
                                        No matches
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    ) : null}
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

function SearchIcon() {
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
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
        </svg>
    );
}
