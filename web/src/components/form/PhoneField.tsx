import { useEffect, useRef, useState, type ReactNode } from 'react';
import { getFluentEmojiCDN } from '@lobehub/fluent-emoji';
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
                    <button
                        aria-label="Choose phone country"
                        className={clsx(
                            'h-10 w-full rounded border-0 px-3 ring-1 transition-[background-color,box-shadow,color] outline-none',
                            error
                                ? 'ring-red-500 focus:ring-2 focus:ring-red-500'
                                : 'ring-ui-300 focus:ring-ui-900 focus:ring-2',
                            'flex cursor-pointer items-center justify-between gap-2 pr-3 text-left'
                        )}
                        onClick={() => {
                            setIsCountryMenuOpen((current) => !current);
                        }}
                        ref={countryButtonRef}
                        type="button"
                    >
                        <span className="text-ui-900 inline-flex min-w-0 items-center gap-2.5 text-sm">
                            <FlagEmoji emoji={selectedOption.flag} />

                            <span className="truncate">
                                +{selectedOption.dialCode}
                            </span>
                        </span>

                        <DropdownChevron
                            className="shrink-0"
                            isOpen={isCountryMenuOpen}
                        />
                    </button>

                    <AnchoredPopover
                        anchorRef={countryButtonRef}
                        onClose={() => {
                            setIsCountryMenuOpen(false);
                        }}
                        open={isCountryMenuOpen}
                    >
                        <MenuPanel className="w-72">
                            <div className="bg-ui-0 sticky top-0 z-10">
                                <DropdownSearchInput
                                    inputRef={searchInputRef}
                                    onChange={setCountrySearch}
                                    placeholder="Search country"
                                    value={countrySearch}
                                />
                            </div>

                            <div
                                className="max-h-64 overflow-y-auto"
                                tabIndex={-1}
                            >
                                {filteredOptions.map((option) => (
                                    <button
                                        className={clsx(
                                            'text-ui-700 hover:bg-ui-100 hover:text-ui-900 focus-visible:ring-ui-900 flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition outline-none focus-visible:ring-2 focus-visible:ring-inset',
                                            option.code === country &&
                                                'bg-ui-50'
                                        )}
                                        key={option.code}
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
                                        <span className="text-ui-900 flex min-w-0 items-center gap-2 truncate">
                                            <FlagEmoji emoji={option.flag} />
                                            <span className="truncate">
                                                {option.name}
                                            </span>
                                            <span className="text-ui-500 shrink-0">
                                                (+{option.dialCode})
                                            </span>
                                        </span>

                                        <span className="text-ui-500 shrink-0">
                                            {option.code}
                                        </span>
                                    </button>
                                ))}

                                {filteredOptions.length === 0 && (
                                    <div className="text-ui-500 px-3 py-2 text-sm">
                                        No matches
                                    </div>
                                )}
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

function FlagEmoji({ emoji }: { emoji: string }) {
    const [useNativeFallback, setUseNativeFallback] = useState(false);

    if (useNativeFallback) {
        return (
            <span
                aria-hidden="true"
                className="inline-flex size-4.5 shrink-0 items-center justify-center text-[18px] leading-none"
                style={{
                    fontFamily: 'var(--emoji-font-family)',
                }}
            >
                {emoji}
            </span>
        );
    }

    return (
        <img
            alt=""
            aria-hidden="true"
            className="size-4.5 shrink-0"
            height={18}
            loading="lazy"
            onError={() => {
                setUseNativeFallback(true);
            }}
            src={getFluentEmojiCDN(emoji, {
                cdn: 'unpkg',
                type: '3d',
            })}
            width={18}
        />
    );
}
