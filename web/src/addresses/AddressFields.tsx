import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type KeyboardEvent,
    type ReactNode,
    type RefCallback,
} from 'react';
import clsx from 'clsx';
import { FaXmark } from 'react-icons/fa6';

import { Field } from '../components/form/Field';
import { InlineInput } from '../components/form/InlineInput';
import { Input } from '../components/form/Input';
import { TextButton } from '../components/form/TextLink';
import { Tooltip } from '../components/ui/Tooltip';
import { BackendError } from '../services/http';
import { AddressText } from '../types/AddressText';
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

type SuggestionFieldName = Exclude<AddressFieldName, 'addressLineTwo'>;

const SEARCH_DEBOUNCE_MS = 400;

const SUGGESTION_FIELDS = new Set<AddressFieldName>([
    'addressLineOne',
    'suburb',
    'state',
    'postcode',
    'country',
]);

interface CollapsedAddressPart {
    autoComplete: string;
    field: AddressFieldName;
    htmlName: string;
    label: string;
    placeholder: string;
}

const COLLAPSED_ADDRESS_PARTS: CollapsedAddressPart[] = [
    {
        autoComplete: 'section-address shipping address-line1',
        field: 'addressLineOne',
        htmlName: 'address-line1',
        label: 'Address line 1',
        placeholder: 'Address line 1',
    },
    {
        autoComplete: 'section-address shipping address-line2',
        field: 'addressLineTwo',
        htmlName: 'address-line2',
        label: 'Address line 2',
        placeholder: 'Address line 2',
    },
    {
        autoComplete: 'section-address shipping address-level2',
        field: 'suburb',
        htmlName: 'address-level2',
        label: 'Suburb',
        placeholder: 'Suburb',
    },
    {
        autoComplete: 'section-address shipping address-level1',
        field: 'state',
        htmlName: 'address-level1',
        label: 'State',
        placeholder: 'State',
    },
    {
        autoComplete: 'section-address shipping postal-code',
        field: 'postcode',
        htmlName: 'postal-code',
        label: 'Postcode',
        placeholder: 'Postcode',
    },
    {
        autoComplete: 'section-address shipping country-name',
        field: 'country',
        htmlName: 'country',
        label: 'Country',
        placeholder: 'Country',
    },
];

export function AddressFields({
    countryCode,
    errors,
    onFieldChange,
    values,
}: AddressFieldsProps) {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const collapsedInputRefs = useRef<
        Partial<Record<AddressFieldName, HTMLInputElement | null>>
    >({});
    const suggestionsCacheRef = useRef(new Map<string, AddressSuggestion[]>());
    const browserLocale = useMemo(() => getBrowserAddressLocale(), []);
    const suggestionCountry = countryCode ?? browserLocale.country;
    const suggestionLanguage = browserLocale.language;

    const collapsedError = getCollapsedAddressError(errors);

    const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
    const [isCollapsedAutofilled, setIsCollapsedAutofilled] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [activeField, setActiveField] = useState<SuggestionFieldName | null>(
        null
    );

    const hasCollapsedAddressValue = COLLAPSED_ADDRESS_PARTS.some((part) =>
        values[part.field].trim()
    );
    const query = activeField ? buildSuggestionQuery(values) : '';

    useEffect(() => {
        if (hasCollapsedAddressValue) return;

        setIsCollapsedAutofilled(false);
    }, [hasCollapsedAddressValue]);

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

        try {
            const address = await addressApi.resolve(suggestion.id, {
                country: suggestionCountry,
                language: suggestionLanguage,
            });

            applyStructuredAddress({
                addressLineOne: address.addressLineOne,
                addressLineTwo: '',
                country: address.country,
                postcode: address.postcode,
                state: address.state,
                suburb: address.suburb,
            });
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
        handleFieldChange(name, AddressText.formatInput(value, label));
    }

    function handleAddressBlur() {
        window.setTimeout(() => {
            const activeElement = document.activeElement;

            if (!rootRef.current?.contains(activeElement)) {
                setActiveField(null);
            }
        }, 100);
    }

    function applyStructuredAddress(nextValues: AddressFormValues) {
        onFieldChange('addressLineOne', nextValues.addressLineOne);
        onFieldChange('addressLineTwo', nextValues.addressLineTwo);
        onFieldChange('suburb', nextValues.suburb);
        onFieldChange('state', nextValues.state);
        onFieldChange('postcode', nextValues.postcode);
        onFieldChange('country', nextValues.country);
    }

    function clearCollapsedAddress() {
        applyStructuredAddress({
            addressLineOne: '',
            addressLineTwo: '',
            country: '',
            postcode: '',
            state: '',
            suburb: '',
        });
        setIsCollapsedAutofilled(false);
        setActiveField(null);
        setSuggestions([]);
        focusCollapsedField('addressLineOne');
    }

    function getSuggestionPanel(fieldName: SuggestionFieldName) {
        if (activeField !== fieldName || suggestions.length === 0) return null;

        return (
            <AddressSuggestionPanel
                onSelect={handleSuggestionSelect}
                suggestions={suggestions}
            />
        );
    }

    function setCollapsedInputRef(
        fieldName: AddressFieldName
    ): RefCallback<HTMLInputElement> {
        return (element) => {
            collapsedInputRefs.current[fieldName] = element;
        };
    }

    function focusCollapsedField(fieldName?: AddressFieldName) {
        if (!fieldName) return;

        const input = collapsedInputRefs.current[fieldName];
        if (!input) return;

        input.focus();
        const cursorPosition = input.value.length;
        input.setSelectionRange(cursorPosition, cursorPosition);
    }

    function handleCollapsedFieldFocus(fieldName: AddressFieldName) {
        setActiveField(
            SUGGESTION_FIELDS.has(fieldName)
                ? (fieldName as SuggestionFieldName)
                : null
        );
    }

    function handleCollapsedFieldChange(
        part: CollapsedAddressPart,
        value: string
    ) {
        const partIndex = COLLAPSED_ADDRESS_PARTS.findIndex(
            (item) => item.field === part.field
        );
        const followingParts = COLLAPSED_ADDRESS_PARTS.slice(partIndex + 1);
        const segments = value.split(',');

        if (segments.length === 1 || followingParts.length === 0) {
            handleSanitizedFieldChange(part.field, value, part.label);
            return;
        }

        handleSanitizedFieldChange(part.field, segments[0] ?? '', part.label);

        segments.slice(1).forEach((segment, index) => {
            const nextPart = followingParts[index];
            if (!nextPart) return;

            handleSanitizedFieldChange(nextPart.field, segment, nextPart.label);
        });

        focusCollapsedField(
            followingParts[
                Math.min(segments.length - 2, followingParts.length - 1)
            ]?.field
        );
    }

    function handleCollapsedFieldKeyDown(
        event: KeyboardEvent<HTMLInputElement>,
        part: CollapsedAddressPart
    ) {
        const partIndex = COLLAPSED_ADDRESS_PARTS.findIndex(
            (item) => item.field === part.field
        );
        const previousPart = COLLAPSED_ADDRESS_PARTS[partIndex - 1];
        const nextPart = COLLAPSED_ADDRESS_PARTS[partIndex + 1];
        const selectionStart = event.currentTarget.selectionStart ?? 0;
        const selectionEnd = event.currentTarget.selectionEnd ?? selectionStart;
        const hasSelection = selectionStart !== selectionEnd;
        const isEmpty = event.currentTarget.value === '';

        if (event.key === ',' && nextPart) {
            event.preventDefault();
            focusCollapsedField(nextPart.field);
            return;
        }

        if (
            event.key === 'Backspace' &&
            isEmpty &&
            !hasSelection &&
            selectionStart === 0 &&
            previousPart
        ) {
            event.preventDefault();
            focusCollapsedField(previousPart.field);
            return;
        }

        if (
            event.key === 'Delete' &&
            isEmpty &&
            !hasSelection &&
            selectionStart === event.currentTarget.value.length &&
            nextPart
        ) {
            event.preventDefault();
            focusCollapsedField(nextPart.field);
        }
    }

    function handleDetailsToggle() {
        setActiveField(null);
        setSuggestions([]);
        setShowDetails((current) => !current);
    }

    function renderDetailsToggle() {
        return (
            <TextButton onClick={handleDetailsToggle} size="small">
                {showDetails ? 'Hide details' : 'Show details'}
            </TextButton>
        );
    }

    function renderCollapsedField() {
        return (
            <CollapsedAddressField
                autofilled={isCollapsedAutofilled}
                error={collapsedError}
                onBlur={handleAddressBlur}
                onAutoFill={() => {
                    setIsCollapsedAutofilled(true);
                }}
                onClear={clearCollapsedAddress}
                onChange={handleCollapsedFieldChange}
                onFocus={handleCollapsedFieldFocus}
                onKeyDown={handleCollapsedFieldKeyDown}
                panel={activeField ? getSuggestionPanel(activeField) : null}
                parts={COLLAPSED_ADDRESS_PARTS}
                setInputRef={setCollapsedInputRef}
                values={values}
            />
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
                        placeholder="Address line 1"
                        value={values.addressLineOne}
                    />

                    <AddressInputField
                        autoComplete="section-address shipping address-line2"
                        action={renderDetailsToggle()}
                        label="Address line 2"
                        name="address-line2"
                        onChange={(value) => {
                            handleSanitizedFieldChange(
                                'addressLineTwo',
                                value,
                                'Address line 2'
                            );
                        }}
                        onFocus={() => {
                            setActiveField(null);
                            setSuggestions([]);
                        }}
                        placeholder="Address line 2"
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
                        placeholder="Suburb"
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
                        placeholder="State"
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
                        placeholder="Postcode"
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
                        placeholder="Country"
                        value={values.country}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="grid gap-2" ref={rootRef}>
            {showDetails ? (
                renderDetailedFields()
            ) : (
                <div className="grid gap-1">
                    <div className="flex items-center justify-between gap-4 text-sm">
                        <span>Address</span>
                        {renderDetailsToggle()}
                    </div>

                    {renderCollapsedField()}

                    {collapsedError ? (
                        <span className="text-sm text-red-700">
                            {collapsedError}
                        </span>
                    ) : null}
                </div>
            )}
        </div>
    );
}

interface CollapsedAddressFieldProps {
    autofilled: boolean;
    error?: string;
    onAutoFill: () => void;
    onBlur: () => void;
    onClear: () => void;
    onChange: (part: CollapsedAddressPart, value: string) => void;
    onFocus: (fieldName: AddressFieldName) => void;
    onKeyDown: (
        event: KeyboardEvent<HTMLInputElement>,
        part: CollapsedAddressPart
    ) => void;
    panel?: ReactNode;
    parts: CollapsedAddressPart[];
    setInputRef: (fieldName: AddressFieldName) => RefCallback<HTMLInputElement>;
    values: AddressFormValues;
}

function CollapsedAddressField({
    autofilled,
    error,
    onAutoFill,
    onBlur,
    onClear,
    onChange,
    onFocus,
    onKeyDown,
    panel,
    parts,
    setInputRef,
    values,
}: CollapsedAddressFieldProps) {
    return (
        <div className="relative">
            <div
                className={clsx(
                    'text-ui-900 flex min-h-10 flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded border-0 py-1.5 pr-2 pl-3 text-sm ring-1 transition-[background-color,box-shadow,color] outline-none',
                    autofilled ? 'bg-blue-50' : 'bg-ui-0',
                    error
                        ? 'ring-red-500 focus-within:ring-2 focus-within:ring-red-500'
                        : 'ring-ui-300 focus-within:ring-ui-900 focus-within:ring-2'
                )}
                data-address-inline-field="true"
            >
                {parts.map((part, index) => (
                    <span
                        className="relative inline-flex max-w-full min-w-0 items-center gap-x-0.5"
                        key={part.field}
                    >
                        <InlineInput
                            aria-label={part.label}
                            autoComplete={part.autoComplete}
                            className="placeholder:text-ui-500 h-5 bg-transparent px-0 py-0 leading-5 outline-none disabled:pointer-events-none"
                            name={part.htmlName}
                            onAutoFill={onAutoFill}
                            onBlur={onBlur}
                            onValueChange={(value) => {
                                onChange(part, value);
                            }}
                            onFocus={() => {
                                onFocus(part.field);
                            }}
                            onKeyDown={(event) => {
                                onKeyDown(event, part);
                            }}
                            placeholder={part.placeholder}
                            ref={setInputRef(part.field)}
                            value={values[part.field]}
                        />

                        {index < parts.length - 1 ? (
                            <span
                                aria-hidden="true"
                                className="text-ui-400 select-none"
                            >
                                ,
                            </span>
                        ) : null}
                    </span>
                ))}

                {parts.some((part) => values[part.field].trim()) ? (
                    <button
                        aria-label="Clear address"
                        className={clsx(
                            'text-ui-400 hover:text-ui-900 focus-visible:ring-ui-900 ml-auto inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset'
                        )}
                        onClick={onClear}
                        type="button"
                    >
                        <FaXmark aria-hidden="true" className="size-3" />
                    </button>
                ) : null}
            </div>

            {panel}
        </div>
    );
}

interface AddressInputFieldProps {
    action?: ReactNode;
    autoComplete: string;
    disabled?: boolean;
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
    action,
    autoComplete,
    disabled = false,
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
        <Input
            autoComplete={autoComplete}
            disabled={disabled}
            hasError={Boolean(error)}
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

    const field = (
        <>
            {panel ? (
                <div className="relative">
                    {input}
                    {panel}
                </div>
            ) : (
                input
            )}
        </>
    );

    if (action) {
        return (
            <div className="grid gap-1 text-sm">
                <div className="flex items-center justify-between gap-4">
                    <span>{label}</span>
                    {action}
                </div>
                {field}
                {error ? <span className="text-red-700">{error}</span> : null}
            </div>
        );
    }

    return (
        <Field error={error} label={label}>
            {field}
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
        <div className="bg-ui-0 border-ui-200 absolute z-10 mt-1 grid w-full gap-1 rounded border p-1 shadow-lg">
            {suggestions.map((suggestion) => (
                <Tooltip
                    className="w-full"
                    key={suggestion.id}
                    label={
                        suggestion.subtitle
                            ? `${suggestion.label}, ${suggestion.subtitle}`
                            : suggestion.label
                    }
                    side="right"
                >
                    <button
                        className={clsx(
                            'hover:bg-ui-50 focus-visible:ring-ui-900 grid w-full gap-0.5 rounded px-3 py-2 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-inset'
                        )}
                        onMouseDown={(event) => {
                            event.preventDefault();
                            void onSelect(suggestion);
                        }}
                        type="button"
                    >
                        <span className="text-ui-900 font-medium">
                            {suggestion.label}
                        </span>

                        {suggestion.subtitle ? (
                            <span className="text-ui-500">
                                {suggestion.subtitle}
                            </span>
                        ) : null}
                    </button>
                </Tooltip>
            ))}
        </div>
    );
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

function getCollapsedAddressError(errors: AddressFieldErrors) {
    return (
        errors.addressLineOne ||
        errors.suburb ||
        errors.state ||
        errors.postcode ||
        errors.country
    );
}
