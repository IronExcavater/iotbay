import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { FaChevronDown } from 'react-icons/fa6';

import { sanitizeAddressField } from '../auth/validation';
import { Button } from '../components/form/Button';
import { Field } from '../components/form/Field';
import { inputClassName } from '../components/form/Input';
import { BackendError } from '../services/http';
import { addressApi, type AddressSuggestion } from './api';
import { getBrowserAddressLocale } from './browserLocale';
import type {
    AddressFieldErrors,
    AddressFieldName,
    AddressFormValues,
} from './form';

interface AddressFieldsProps {
    countryCode?: string;
    errors: AddressFieldErrors;
    onFieldChange: (name: AddressFieldName, value: string) => void;
    values: AddressFormValues;
}

type SearchFieldName =
    | 'search'
    | 'addressLineOne'
    | 'suburb'
    | 'state'
    | 'postcode'
    | 'country';

const SEARCH_DEBOUNCE_MS = 400;

interface AddressPlaceholders {
    country: string;
    postcode: string;
    state: string;
    suburb: string;
}

const FALLBACK_REGION_NAMES = new Intl.DisplayNames(['en'], { type: 'region' });

const DEFAULT_PLACEHOLDERS: AddressPlaceholders = {
    country: 'Australia',
    postcode: '2000',
    state: 'NSW',
    suburb: 'Sydney',
};

const PLACEHOLDERS: Record<string, AddressPlaceholders> = {
    AU: DEFAULT_PLACEHOLDERS,
    CA: {
        country: 'Canada',
        postcode: 'M5V 2T6',
        state: 'ON',
        suburb: 'Toronto',
    },
    GB: {
        country: 'United Kingdom',
        postcode: 'SW1A 1AA',
        state: 'Greater London',
        suburb: 'London',
    },
    IN: {
        country: 'India',
        postcode: '400001',
        state: 'Maharashtra',
        suburb: 'Mumbai',
    },
    NZ: {
        country: 'New Zealand',
        postcode: '6011',
        state: 'Wellington',
        suburb: 'Wellington',
    },
    PH: {
        country: 'Philippines',
        postcode: '1226',
        state: 'Metro Manila',
        suburb: 'Makati',
    },
    SG: {
        country: 'Singapore',
        postcode: '018989',
        state: 'Central Singapore',
        suburb: 'Singapore',
    },
    US: {
        country: 'United States',
        postcode: '10001',
        state: 'NY',
        suburb: 'New York',
    },
};

export function AddressFields({
    countryCode,
    errors,
    onFieldChange,
    values,
}: AddressFieldsProps) {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const autoResolvedQueryRef = useRef('');
    const suggestionsCacheRef = useRef(new Map<string, AddressSuggestion[]>());
    const browserLocale = useMemo(() => getBrowserAddressLocale(), []);
    const suggestionCountry = countryCode ?? browserLocale.country;
    const suggestionLanguage = browserLocale.language;

    const placeholders = getAddressPlaceholders(
        suggestionCountry,
        suggestionLanguage
    );
    const collapsedPlaceholder = buildCollapsedAddressPlaceholder(placeholders);

    const [searchValue, setSearchValue] = useState('');
    const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
    const [showDetails, setShowDetails] = useState(false);
    const [activeField, setActiveField] = useState<SearchFieldName | null>(
        null
    );

    const collapsedAddressValue = buildCollapsedAddressValue(values);
    const isSearchActive = activeField === 'search';
    const searchInputValue = isSearchActive
        ? searchValue
        : collapsedAddressValue;

    const query = showDetails
        ? buildSuggestionQuery(values)
        : searchValue.trim();

    useEffect(() => {
        if (showDetails || activeField !== 'search') setSearchValue('');
    }, [activeField, showDetails]);

    useEffect(() => {
        if (!activeField || query.length < 3) {
            setSuggestions([]);
            return;
        }

        const controller = new AbortController();
        const timeoutId = window.setTimeout(async () => {
            try {
                const cacheKey = [
                    suggestionCountry ?? '',
                    suggestionLanguage ?? '',
                    query,
                ].join('|');
                const cachedItems = suggestionsCacheRef.current.get(cacheKey);

                if (cachedItems) {
                    setSuggestions(cachedItems);
                    return;
                }

                const items = await addressApi.suggest(query, {
                    country: suggestionCountry,
                    language: suggestionLanguage,
                    signal: controller.signal,
                });
                suggestionsCacheRef.current.set(cacheKey, items);
                setSuggestions(items);
            } catch (error) {
                if (controller.signal.aborted) return;

                if (
                    error instanceof BackendError &&
                    error.code === 'ADDRESS_LOOKUP_UNAVAILABLE'
                ) {
                    setSuggestions([]);
                    return;
                }

                setSuggestions([]);
            }
        }, SEARCH_DEBOUNCE_MS);

        return () => {
            controller.abort();
            window.clearTimeout(timeoutId);
        };
    }, [activeField, query, suggestionCountry, suggestionLanguage]);

    async function handleSuggestionSelect(suggestion: AddressSuggestion) {
        setSuggestions([]);
        setActiveField(null);
        setSearchValue('');

        try {
            const address = await addressApi.resolve(suggestion.id, {
                country: suggestionCountry,
                language: suggestionLanguage,
            });

            onFieldChange('addressLineOne', address.addressLineOne);
            onFieldChange('addressLineTwo', '');
            onFieldChange('suburb', address.suburb);
            onFieldChange('state', address.state);
            onFieldChange('postcode', address.postcode);
            onFieldChange('country', address.country);
        } catch {
            setSuggestions([]);
        }
    }

    function handleFieldChange(name: AddressFieldName, value: string) {
        onFieldChange(name, value);
    }

    function handleSanitizedFieldChange(
        name: AddressFieldName,
        value: string,
        label: string
    ) {
        handleFieldChange(name, sanitizeAddressField(value, label));
    }

    function handleSearchFieldChange(value: string) {
        const sanitized = sanitizeAddressField(value, 'Address');
        setSearchValue(sanitized);
        onFieldChange('addressLineOne', sanitized);
    }

    function handleAddressBlur() {
        window.setTimeout(() => {
            const activeElement = document.activeElement;

            if (!rootRef.current?.contains(activeElement)) {
                if (activeField === 'search') void applyCollapsedSearchValue();

                setActiveField(null);
            }
        }, 100);
    }

    async function applyCollapsedSearchValue() {
        const normalized = searchValue.trim();

        if (!normalized) return;

        if (autoResolvedQueryRef.current === normalized) return;

        const [suggestion] = suggestions;

        if (suggestions.length === 1 && suggestion) {
            autoResolvedQueryRef.current = normalized;
            await handleSuggestionSelect(suggestion);
            return;
        }

        if (!hasStructuredAddress(values))
            onFieldChange('addressLineOne', normalized);
    }

    function getSuggestionPanel(fieldName: SearchFieldName) {
        if (activeField !== fieldName || suggestions.length === 0) return null;

        return (
            <AddressSuggestionPanel
                onSelect={handleSuggestionSelect}
                suggestions={suggestions}
            />
        );
    }

    function handleDetailsToggle() {
        setActiveField(null);
        setSuggestions([]);
        setShowDetails((current) => !current);
    }

    function renderCollapsedField() {
        return (
            <>
                <HiddenAutofillFields
                    onFieldChange={handleSanitizedFieldChange}
                    values={values}
                />

                <Field error={errors.addressLineOne} label="Address">
                    <AddressInputField
                        autoComplete="section-address shipping address-line1"
                        error={errors.addressLineOne}
                        name="address-line1"
                        onBlur={handleAddressBlur}
                        onChange={handleSearchFieldChange}
                        onFocus={() => {
                            setActiveField('search');
                            setSearchValue((current) => {
                                if (current) return current;

                                return values.addressLineOne.trim();
                            });
                        }}
                        panel={getSuggestionPanel('search')}
                        placeholder={collapsedPlaceholder}
                        value={searchInputValue}
                    />
                </Field>
            </>
        );
    }

    function renderDetailedFields() {
        return (
            <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
                    <AddressInputField
                        autoComplete="section-address shipping address-line1"
                        error={errors.addressLineOne}
                        label="Address line 1"
                        name="address-line1"
                        onBlur={handleAddressBlur}
                        onChange={(value) => {
                            handleSanitizedFieldChange(
                                'addressLineOne',
                                value,
                                'Address line 1'
                            );
                        }}
                        onFocus={() => {
                            setActiveField('addressLineOne');
                        }}
                        panel={getSuggestionPanel('addressLineOne')}
                        placeholder="12 Harbour Road"
                        value={values.addressLineOne}
                    />

                    <AddressInputField
                        autoComplete="section-address shipping address-line2"
                        label="Address line 2"
                        name="address-line2"
                        onChange={(value) => {
                            handleSanitizedFieldChange(
                                'addressLineTwo',
                                value,
                                'Address line 2'
                            );
                        }}
                        placeholder="Apartment 4B"
                        value={values.addressLineTwo}
                    />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
                    <AddressInputField
                        autoComplete="section-address shipping address-level2"
                        error={errors.suburb}
                        label="Suburb"
                        name="address-level2"
                        onBlur={handleAddressBlur}
                        onChange={(value) => {
                            handleSanitizedFieldChange(
                                'suburb',
                                value,
                                'Suburb'
                            );
                        }}
                        onFocus={() => {
                            setActiveField('suburb');
                        }}
                        panel={getSuggestionPanel('suburb')}
                        placeholder={placeholders.suburb}
                        value={values.suburb}
                    />

                    <AddressInputField
                        autoComplete="section-address shipping address-level1"
                        error={errors.state}
                        label="State"
                        name="address-level1"
                        onBlur={handleAddressBlur}
                        onChange={(value) => {
                            handleSanitizedFieldChange('state', value, 'State');
                        }}
                        onFocus={() => {
                            setActiveField('state');
                        }}
                        panel={getSuggestionPanel('state')}
                        placeholder={placeholders.state}
                        value={values.state}
                    />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
                    <AddressInputField
                        autoComplete="section-address shipping postal-code"
                        error={errors.postcode}
                        label="Postcode"
                        name="postal-code"
                        onBlur={handleAddressBlur}
                        onChange={(value) => {
                            handleSanitizedFieldChange(
                                'postcode',
                                value,
                                'Postcode'
                            );
                        }}
                        onFocus={() => {
                            setActiveField('postcode');
                        }}
                        panel={getSuggestionPanel('postcode')}
                        placeholder={placeholders.postcode}
                        value={values.postcode}
                    />

                    <AddressInputField
                        autoComplete="section-address shipping country-name"
                        error={errors.country}
                        label="Country"
                        name="country"
                        onBlur={handleAddressBlur}
                        onChange={(value) => {
                            handleSanitizedFieldChange(
                                'country',
                                value,
                                'Country'
                            );
                        }}
                        onFocus={() => {
                            setActiveField('country');
                        }}
                        panel={getSuggestionPanel('country')}
                        placeholder={placeholders.country}
                        value={values.country}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="grid gap-1" ref={rootRef}>
            {!showDetails && renderCollapsedField()}

            {showDetails && renderDetailedFields()}

            <Button
                className="self-start whitespace-nowrap"
                onClick={handleDetailsToggle}
                type="button"
                variant="text"
            >
                <FaChevronDown
                    aria-hidden="true"
                    className={clsx(
                        'h-4 w-4 shrink-0 transition-transform duration-200 ease-out',
                        showDetails && 'rotate-180'
                    )}
                />

                <span className="whitespace-nowrap">
                    {showDetails
                        ? 'Hide address details'
                        : 'Show address details'}
                </span>
            </Button>
        </div>
    );
}

interface AddressInputFieldProps {
    autoComplete: string;
    error?: string;
    label?: ReactNode;
    name: string;
    onBlur?: () => void;
    onChange: (value: string) => void;
    onFocus?: () => void;
    panel?: ReactNode;
    placeholder: string;
    value: string;
}

function AddressInputField({
    autoComplete,
    error,
    label,
    name,
    onBlur,
    onChange,
    onFocus,
    panel,
    placeholder,
    value,
}: AddressInputFieldProps) {
    const input = (
        <input
            autoComplete={autoComplete}
            className={inputClassName(Boolean(error))}
            name={name}
            onBlur={onBlur}
            onChange={(event) => {
                onChange(event.target.value);
            }}
            onFocus={onFocus}
            placeholder={placeholder}
            value={value}
        />
    );

    return (
        <Field error={error} label={label}>
            {panel ? (
                <div className="relative">
                    {input}
                    {panel}
                </div>
            ) : (
                input
            )}
        </Field>
    );
}

function AddressSuggestionPanel({
    onSelect,
    suggestions,
}: {
    onSelect: (suggestion: AddressSuggestion) => Promise<void>;
    suggestions: AddressSuggestion[];
}) {
    return (
        <div className="absolute z-10 mt-1 grid w-full gap-1 rounded border border-slate-200 bg-white p-1 shadow-lg">
            {suggestions.map((suggestion) => (
                <button
                    className="grid gap-0.5 rounded px-3 py-2 text-left text-sm hover:bg-slate-50"
                    key={suggestion.id}
                    onMouseDown={(event) => {
                        event.preventDefault();
                        void onSelect(suggestion);
                    }}
                    title={
                        suggestion.subtitle
                            ? `${suggestion.label}, ${suggestion.subtitle}`
                            : suggestion.label
                    }
                    type="button"
                >
                    <span className="font-medium text-slate-900">
                        {suggestion.label}
                    </span>

                    {suggestion.subtitle ? (
                        <span className="text-slate-500">
                            {suggestion.subtitle}
                        </span>
                    ) : null}
                </button>
            ))}
        </div>
    );
}

function getAddressPlaceholders(countryCode?: string, language = 'en') {
    const normalizedCountryCode = countryCode?.trim().toUpperCase();
    const matchedPlaceholders =
        (normalizedCountryCode && PLACEHOLDERS[normalizedCountryCode]) ||
        DEFAULT_PLACEHOLDERS;

    return {
        ...matchedPlaceholders,
        country:
            resolveRegionName(normalizedCountryCode, language) ??
            matchedPlaceholders.country,
    };
}

function resolveRegionName(countryCode: string | undefined, language: string) {
    if (!countryCode) return undefined;

    try {
        return (
            new Intl.DisplayNames([language || 'en'], {
                type: 'region',
            }).of(countryCode) ??
            FALLBACK_REGION_NAMES.of(countryCode) ??
            undefined
        );
    } catch {
        return FALLBACK_REGION_NAMES.of(countryCode) ?? undefined;
    }
}

function buildSuggestionQuery(values: AddressFormValues) {
    return [
        values.addressLineOne,
        values.suburb,
        values.state,
        values.postcode,
        values.country,
    ]
        .map((value) => value.trim())
        .filter(Boolean)
        .join(', ');
}

function buildCollapsedAddressValue(values: AddressFormValues) {
    const locality = [values.suburb, values.state, values.postcode]
        .map((value) => value.trim())
        .filter(Boolean)
        .join(' ');

    return [
        values.addressLineOne.trim(),
        locality,
        values.country.trim(),
        values.addressLineTwo.trim(),
    ]
        .filter(Boolean)
        .join(', ');
}

function buildCollapsedAddressPlaceholder(placeholders: AddressPlaceholders) {
    return [
        '12 Harbour Road',
        `${placeholders.suburb} ${placeholders.state} ${placeholders.postcode}`,
        placeholders.country,
        'Apartment 4B',
    ].join(', ');
}

function hasStructuredAddress(values: AddressFormValues) {
    return Boolean(
        values.addressLineOne.trim() ||
        values.addressLineTwo.trim() ||
        values.suburb.trim() ||
        values.state.trim() ||
        values.postcode.trim() ||
        values.country.trim()
    );
}

function HiddenAutofillFields({
    onFieldChange,
    values,
}: {
    onFieldChange: (
        name: AddressFieldName,
        value: string,
        label: string
    ) => void;
    values: AddressFormValues;
}) {
    // Browsers and password managers often know how to autofill the standard
    // address fields but not the collapsed search UI, so mirror those fields
    // off-screen and feed the values back into the real form state.
    return (
        <div aria-hidden="true" className="sr-only">
            <input
                autoComplete="section-address shipping address-line2"
                name="address-line2"
                onChange={(event) => {
                    onFieldChange(
                        'addressLineTwo',
                        event.target.value,
                        'Address line 2'
                    );
                }}
                tabIndex={-1}
                value={values.addressLineTwo}
            />

            <input
                autoComplete="section-address shipping address-level2"
                name="address-level2"
                onChange={(event) => {
                    onFieldChange('suburb', event.target.value, 'Suburb');
                }}
                tabIndex={-1}
                value={values.suburb}
            />

            <input
                autoComplete="section-address shipping address-level1"
                name="address-level1"
                onChange={(event) => {
                    onFieldChange('state', event.target.value, 'State');
                }}
                tabIndex={-1}
                value={values.state}
            />

            <input
                autoComplete="section-address shipping postal-code"
                name="postal-code"
                onChange={(event) => {
                    onFieldChange('postcode', event.target.value, 'Postcode');
                }}
                tabIndex={-1}
                value={values.postcode}
            />

            <input
                autoComplete="section-address shipping country-name"
                name="country"
                onChange={(event) => {
                    onFieldChange('country', event.target.value, 'Country');
                }}
                tabIndex={-1}
                value={values.country}
            />
        </div>
    );
}
