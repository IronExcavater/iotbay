import { useEffect, useMemo, useRef, useState } from 'react';

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
    const placeholders = getAddressPlaceholders(
        countryCode ?? browserLocale.country,
        browserLocale.language
    );
    const collapsedAddressValue = buildCollapsedAddressValue(values);
    const [searchValue, setSearchValue] = useState('');
    const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
    const [selectedQuery, setSelectedQuery] = useState('');
    const [showDetails, setShowDetails] = useState(false);
    const [activeField, setActiveField] = useState<SearchFieldName | null>(
        null
    );
    const query = showDetails
        ? buildSuggestionQuery(values)
        : searchValue.trim();

    useEffect(() => {
        if (showDetails || activeField !== 'search') {
            setSearchValue('');
        }
    }, [activeField, showDetails]);

    useEffect(() => {
        if (!activeField || query.length < 3 || query === selectedQuery) {
            setSuggestions([]);
            return;
        }

        const controller = new AbortController();
        const timeoutId = window.setTimeout(async () => {
            try {
                const cacheKey = [
                    countryCode ?? browserLocale.country ?? '',
                    browserLocale.language ?? '',
                    query,
                ].join('|');
                const cachedItems = suggestionsCacheRef.current.get(cacheKey);
                if (cachedItems) {
                    setSuggestions(cachedItems);
                    return;
                }

                const items = await addressApi.suggest(query, {
                    country: countryCode ?? browserLocale.country,
                    language: browserLocale.language,
                    signal: controller.signal,
                });
                suggestionsCacheRef.current.set(cacheKey, items);
                setSuggestions(items);
            } catch (error) {
                if (controller.signal.aborted) {
                    return;
                }
                if (
                    error instanceof BackendError &&
                    error.code === 'ADDRESS_LOOKUP_UNAVAILABLE'
                ) {
                    setSuggestions([]);
                    return;
                }
                setSuggestions([]);
            } finally {
                // no-op: suggestion UI does not show a loading indicator
            }
        }, SEARCH_DEBOUNCE_MS);

        return () => {
            controller.abort();
            window.clearTimeout(timeoutId);
        };
    }, [
        browserLocale.country,
        browserLocale.language,
        countryCode,
        activeField,
        query,
        selectedQuery,
    ]);

    async function handleSuggestionSelect(suggestion: AddressSuggestion) {
        setSuggestions([]);
        setActiveField(null);
        setSearchValue('');

        try {
            const address = await addressApi.resolve(suggestion.id, {
                country: countryCode ?? browserLocale.country,
                language: browserLocale.language,
            });
            const nextValues = {
                ...values,
                addressLineOne: address.addressLineOne,
                addressLineTwo: '',
                country: address.country,
                postcode: address.postcode,
                state: address.state,
                suburb: address.suburb,
            };
            setSelectedQuery(buildSuggestionQuery(nextValues));
            onFieldChange('addressLineOne', nextValues.addressLineOne);
            onFieldChange('addressLineTwo', '');
            onFieldChange('suburb', nextValues.suburb);
            onFieldChange('state', nextValues.state);
            onFieldChange('postcode', nextValues.postcode);
            onFieldChange('country', nextValues.country);
        } catch {
            setSelectedQuery('');
        }
    }

    function handleFieldChange(name: AddressFieldName, value: string) {
        setSelectedQuery('');
        onFieldChange(name, value);
    }

    function handleSearchFieldChange(value: string) {
        const sanitized = sanitizeAddressField(value, 'Address');
        setSearchValue(sanitized);
        setSelectedQuery('');
        onFieldChange('addressLineOne', sanitized);
    }

    function handleAddressBlur() {
        window.setTimeout(() => {
            const activeElement = document.activeElement;
            if (!rootRef.current?.contains(activeElement)) {
                if (activeField === 'search') {
                    void applyCollapsedSearchValue();
                }
                setActiveField(null);
            }
        }, 100);
    }

    async function applyCollapsedSearchValue() {
        const normalized = searchValue.trim();
        if (!normalized) {
            return;
        }

        if (autoResolvedQueryRef.current === normalized) {
            return;
        }

        const [suggestion] = suggestions;
        if (suggestions.length === 1 && suggestion) {
            autoResolvedQueryRef.current = normalized;
            await handleSuggestionSelect(suggestion);
            return;
        }

        if (!hasStructuredAddress(values)) {
            onFieldChange('addressLineOne', normalized);
        }
    }

    function renderSuggestionPanel(fieldName: SearchFieldName) {
        if (activeField !== fieldName) {
            return null;
        }

        if (suggestions.length === 0) {
            return null;
        }

        return (
            <div className="absolute z-10 mt-1 grid w-full gap-1 rounded border border-slate-200 bg-white p-1 shadow-lg">
                {suggestions.map((suggestion) => (
                    <button
                        className="grid gap-0.5 rounded px-3 py-2 text-left text-sm hover:bg-slate-50"
                        key={suggestion.id}
                        onMouseDown={(event) => {
                            event.preventDefault();
                            void handleSuggestionSelect(suggestion);
                        }}
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

    return (
        <div className="grid gap-1" ref={rootRef}>
            {!showDetails ? (
                <>
                    <HiddenAutofillFields
                        onFieldChange={handleFieldChange}
                        values={values}
                    />
                    <Field error={errors.addressLineOne} label="Address">
                        <div className="relative">
                            <input
                                autoComplete="section-address shipping address-line1"
                                className={inputClassName(
                                    Boolean(errors.addressLineOne)
                                )}
                                name="address-line1"
                                onBlur={handleAddressBlur}
                                onChange={(event) => {
                                    handleSearchFieldChange(event.target.value);
                                }}
                                onFocus={() => {
                                    setActiveField('search');
                                    setSearchValue((current) => {
                                        if (current) {
                                            return current;
                                        }
                                        return values.addressLineOne.trim();
                                    });
                                }}
                                placeholder={`12 Harbour Road, Sydney NSW 2000, ${placeholders.country}, Apartment 4B`}
                                value={
                                    activeField === 'search'
                                        ? searchValue
                                        : collapsedAddressValue
                                }
                            />
                            {renderSuggestionPanel('search')}
                        </div>
                    </Field>
                </>
            ) : null}

            {showDetails ? (
                <div className="grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
                        <Field
                            error={errors.addressLineOne}
                            label="Address line 1"
                        >
                            <div className="relative">
                                <input
                                    autoComplete="section-address shipping address-line1"
                                    className={inputClassName(
                                        Boolean(errors.addressLineOne)
                                    )}
                                    name="address-line1"
                                    onBlur={handleAddressBlur}
                                    onChange={(event) => {
                                        handleFieldChange(
                                            'addressLineOne',
                                            sanitizeAddressField(
                                                event.target.value,
                                                'Address line 1'
                                            )
                                        );
                                    }}
                                    onFocus={() => {
                                        setActiveField('addressLineOne');
                                    }}
                                    placeholder="12 Harbour Road"
                                    value={values.addressLineOne}
                                />
                                {renderSuggestionPanel('addressLineOne')}
                            </div>
                        </Field>

                        <Field label="Address line 2">
                            <input
                                autoComplete="section-address shipping address-line2"
                                className={inputClassName(false)}
                                name="address-line2"
                                onChange={(event) => {
                                    handleFieldChange(
                                        'addressLineTwo',
                                        sanitizeAddressField(
                                            event.target.value,
                                            'Address line 2'
                                        )
                                    );
                                }}
                                placeholder="Apartment 4B"
                                value={values.addressLineTwo}
                            />
                        </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
                        <Field error={errors.suburb} label="Suburb">
                            <div className="relative">
                                <input
                                    autoComplete="section-address shipping address-level2"
                                    className={inputClassName(
                                        Boolean(errors.suburb)
                                    )}
                                    name="address-level2"
                                    onBlur={handleAddressBlur}
                                    onChange={(event) => {
                                        handleFieldChange(
                                            'suburb',
                                            sanitizeAddressField(
                                                event.target.value,
                                                'Suburb'
                                            )
                                        );
                                    }}
                                    onFocus={() => {
                                        setActiveField('suburb');
                                    }}
                                    placeholder={placeholders.suburb}
                                    value={values.suburb}
                                />
                                {renderSuggestionPanel('suburb')}
                            </div>
                        </Field>

                        <Field error={errors.state} label="State">
                            <div className="relative">
                                <input
                                    autoComplete="section-address shipping address-level1"
                                    className={inputClassName(
                                        Boolean(errors.state)
                                    )}
                                    name="address-level1"
                                    onBlur={handleAddressBlur}
                                    onChange={(event) => {
                                        handleFieldChange(
                                            'state',
                                            sanitizeAddressField(
                                                event.target.value,
                                                'State'
                                            )
                                        );
                                    }}
                                    onFocus={() => {
                                        setActiveField('state');
                                    }}
                                    placeholder={placeholders.state}
                                    value={values.state}
                                />
                                {renderSuggestionPanel('state')}
                            </div>
                        </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
                        <Field error={errors.postcode} label="Postcode">
                            <div className="relative">
                                <input
                                    autoComplete="section-address shipping postal-code"
                                    className={inputClassName(
                                        Boolean(errors.postcode)
                                    )}
                                    name="postal-code"
                                    onBlur={handleAddressBlur}
                                    onChange={(event) => {
                                        handleFieldChange(
                                            'postcode',
                                            sanitizeAddressField(
                                                event.target.value,
                                                'Postcode'
                                            )
                                        );
                                    }}
                                    onFocus={() => {
                                        setActiveField('postcode');
                                    }}
                                    placeholder={placeholders.postcode}
                                    value={values.postcode}
                                />
                                {renderSuggestionPanel('postcode')}
                            </div>
                        </Field>

                        <Field error={errors.country} label="Country">
                            <div className="relative">
                                <input
                                    autoComplete="section-address shipping country-name"
                                    className={inputClassName(
                                        Boolean(errors.country)
                                    )}
                                    name="country"
                                    onBlur={handleAddressBlur}
                                    onChange={(event) => {
                                        handleFieldChange(
                                            'country',
                                            sanitizeAddressField(
                                                event.target.value,
                                                'Country'
                                            )
                                        );
                                    }}
                                    onFocus={() => {
                                        setActiveField('country');
                                    }}
                                    placeholder={placeholders.country}
                                    value={values.country}
                                />
                                {renderSuggestionPanel('country')}
                            </div>
                        </Field>
                    </div>
                </div>
            ) : null}

            <Button
                className="self-start whitespace-nowrap"
                onClick={() => {
                    setActiveField(null);
                    setSuggestions([]);
                    setShowDetails((current) => !current);
                }}
                type="button"
                variant="text"
            >
                <svg
                    aria-hidden="true"
                    className={`h-4 w-4 shrink-0 transition-transform duration-200 ease-out ${showDetails ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.75"
                    viewBox="0 0 24 24"
                >
                    <path d="m6 9 6 6 6-6" />
                </svg>
                <span className="whitespace-nowrap">
                    {showDetails
                        ? 'Hide address details'
                        : 'Show address details'}
                </span>
            </Button>
        </div>
    );
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
    if (!countryCode) {
        return undefined;
    }

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
    onFieldChange: (name: AddressFieldName, value: string) => void;
    values: AddressFormValues;
}) {
    return (
        <div aria-hidden="true" className="sr-only">
            <input
                autoComplete="section-address shipping address-line2"
                name="address-line2"
                onChange={(event) => {
                    onFieldChange(
                        'addressLineTwo',
                        sanitizeAddressField(
                            event.target.value,
                            'Address line 2'
                        )
                    );
                }}
                tabIndex={-1}
                value={values.addressLineTwo}
            />
            <input
                autoComplete="section-address shipping address-level2"
                name="address-level2"
                onChange={(event) => {
                    onFieldChange(
                        'suburb',
                        sanitizeAddressField(event.target.value, 'Suburb')
                    );
                }}
                tabIndex={-1}
                value={values.suburb}
            />
            <input
                autoComplete="section-address shipping address-level1"
                name="address-level1"
                onChange={(event) => {
                    onFieldChange(
                        'state',
                        sanitizeAddressField(event.target.value, 'State')
                    );
                }}
                tabIndex={-1}
                value={values.state}
            />
            <input
                autoComplete="section-address shipping postal-code"
                name="postal-code"
                onChange={(event) => {
                    onFieldChange(
                        'postcode',
                        sanitizeAddressField(event.target.value, 'Postcode')
                    );
                }}
                tabIndex={-1}
                value={values.postcode}
            />
            <input
                autoComplete="section-address shipping country-name"
                name="country"
                onChange={(event) => {
                    onFieldChange(
                        'country',
                        sanitizeAddressField(event.target.value, 'Country')
                    );
                }}
                tabIndex={-1}
                value={values.country}
            />
        </div>
    );
}
