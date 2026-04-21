import { useEffect, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import type { CountryCode } from 'libphonenumber-js';

import {
    formatPhoneDisplay,
    formatPhoneInput,
    PHONE_COUNTRY_OPTIONS,
    PHONE_NUMBER_MAX_LENGTH,
} from '../../auth/phone';
import { useSearchFilter } from '../../hooks/useSearchFilter';
import { AnchoredPopover } from '../overlay/AnchoredPopover';
import { MenuPanel } from '../overlay/MenuItems';
import { Tooltip } from '../ui/Tooltip';
import { DropdownChevron } from './DropdownChevron';
import { DropdownSearchInput } from './DropdownSearchInput';
import { Field } from './Field';
import { Input } from './Input';

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
    const countryButtonRef = useRef<HTMLButtonElement | null>(null);

    const fieldLabel =
        typeof label === 'string' || typeof label === 'number'
            ? String(label)
            : 'Phone number';

    const selectedOption =
        PHONE_COUNTRY_OPTIONS.find((option) => option.code === country) ??
        PHONE_COUNTRY_OPTIONS[0];

    const filteredOptions = useSearchFilter(
        PHONE_COUNTRY_OPTIONS,
        countrySearch,
        (option) => [
            option.code,
            option.name,
            option.dialCode,
            option.dropdownLabel,
        ]
    );

    useEffect(() => {
        if (!isFocused || inputRef.current === null) return;

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

    // Keep the editing experience forgiving while preserving the cleaner
    // read-only presentation when the field is not active.
    const displayValue = isFocused
        ? formatPhoneInput(value, country)
        : formatPhoneDisplay(value, country);

    return (
        <Field error={error} label={label} required={required}>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,7.25rem)_1fr] sm:items-start">
                <div className="relative">
                    <Tooltip className="w-full" label="Choose phone country">
                        <button
                            aria-label="Choose phone country"
                            className={clsx(
                                'w-full rounded border border-slate-300 px-3 py-2',
                                'flex cursor-pointer items-center justify-between gap-2 pr-3 text-left'
                            )}
                            onClick={() => {
                                setIsCountryMenuOpen((current) => !current);
                            }}
                            ref={countryButtonRef}
                            type="button"
                        >
                            <span className="inline-flex min-w-0 items-center gap-2.5 text-sm text-slate-900">
                                <span className="shrink-0">
                                    {selectedOption.flag}
                                </span>

                                <span className="truncate">
                                    +{selectedOption.dialCode}
                                </span>
                            </span>

                            <DropdownChevron
                                className="shrink-0"
                                isOpen={isCountryMenuOpen}
                            />
                        </button>
                    </Tooltip>

                    <AnchoredPopover
                        anchorRef={countryButtonRef}
                        onClose={() => {
                            setIsCountryMenuOpen(false);
                        }}
                        open={isCountryMenuOpen}
                    >
                        <MenuPanel className="w-72">
                            <div className="sticky top-0 border-b border-slate-200 pb-2">
                                <DropdownSearchInput
                                    inputRef={searchInputRef}
                                    onChange={setCountrySearch}
                                    placeholder="Search country"
                                    value={countrySearch}
                                />
                            </div>

                            <div className="max-h-64 overflow-y-auto">
                                {filteredOptions.map((option) => (
                                    <Tooltip
                                        className="w-full"
                                        key={option.code}
                                        label={option.dropdownLabel}
                                        side="right"
                                    >
                                        <button
                                            className={clsx(
                                                'inline-flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 hover:text-slate-900',
                                                'flex cursor-pointer items-center justify-between gap-3',
                                                option.code === country &&
                                                    'bg-slate-50'
                                            )}
                                            onClick={() => {
                                                setIsCountryMenuOpen(false);
                                                onCountryChange(option.code);

                                                if (!value.trim()) return;

                                                onNumberChange(
                                                    formatPhoneInput(
                                                        value,
                                                        option.code
                                                    )
                                                );
                                            }}
                                            type="button"
                                        >
                                            <span className="truncate text-slate-900">
                                                {option.dropdownLabel}
                                            </span>

                                            <span className="shrink-0 text-slate-500">
                                                {option.code}
                                            </span>
                                        </button>
                                    </Tooltip>
                                ))}

                                {filteredOptions.length === 0 ? (
                                    <div className="px-3 py-2 text-sm text-slate-500">
                                        No matches
                                    </div>
                                ) : null}
                            </div>
                        </MenuPanel>
                    </AnchoredPopover>
                </div>

                <Input
                    aria-label={fieldLabel}
                    hasError={Boolean(error)}
                    inputMode="tel"
                    maxLength={PHONE_NUMBER_MAX_LENGTH}
                    onBlur={() => {
                        setIsFocused(false);
                        onBlur?.();
                    }}
                    onChange={(event) => {
                        onNumberChange(
                            formatPhoneInput(event.target.value, country)
                        );
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
