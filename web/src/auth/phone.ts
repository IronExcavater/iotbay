import {
    type CountryCode,
    getCountries,
    getCountryCallingCode,
    parsePhoneNumberFromString,
} from 'libphonenumber-js';

import { getBrowserAddressLocale } from '../addresses/browserLocale';
import { backendErrorMessage } from '../services/http';
import {
    DEFAULT_PHONE_COUNTRY,
    PHONE_NUMBER_MAX_LENGTH,
    PhoneValidator,
} from '../validation/phone';

export { DEFAULT_PHONE_COUNTRY, PHONE_NUMBER_MAX_LENGTH };

export interface PhoneCountryOption {
    code: CountryCode;
    dialCode: string;
    flag: string;
    dropdownLabel: string;
    triggerLabel: string;
    name: string;
}

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

export const PHONE_COUNTRY_OPTIONS: PhoneCountryOption[] = getCountries()
    .map((code) => {
        const name = regionNames.of(code) ?? code;
        const dialCode = getCountryCallingCode(code);
        const flag = countryFlag(code);

        return {
            code,
            dialCode,
            flag,
            dropdownLabel: `${flag} ${name} (+${dialCode})`,
            triggerLabel: `${flag} +${dialCode}`,
            name,
        };
    })
    .sort((left, right) => left.name.localeCompare(right.name));

const PHONE_VALIDATOR = new PhoneValidator(
    {
        fieldName: 'phone number',
        maxLength: PHONE_NUMBER_MAX_LENGTH,
        asciiOnly: true,
        printableAsciiOnly: true,
    },
    DEFAULT_PHONE_COUNTRY
);

export function normalizePhoneCountry(value?: string | null): CountryCode {
    const country = value?.trim().toUpperCase();
    if (!country) {
        return DEFAULT_PHONE_COUNTRY;
    }

    return PHONE_COUNTRY_OPTIONS.some((option) => option.code === country)
        ? (country as CountryCode)
        : DEFAULT_PHONE_COUNTRY;
}

export function getBrowserPhoneCountry(): CountryCode {
    return normalizePhoneCountry(getBrowserAddressLocale().country);
}

export function formatPhoneInput(value: string, country: CountryCode) {
    return PHONE_VALIDATOR.formatInput(value, country);
}

export function validatePhoneNumber(value: string, country: CountryCode) {
    const error = PHONE_VALIDATOR.tryValidate(value, {
        phoneCountry: country,
    }).error;
    return error
        ? backendErrorMessage(
              error.code,
              `${error.message.charAt(0).toUpperCase()}${error.message.slice(1)}`
          )
        : null;
}

export function normalizeComparablePhoneNumber(
    value: string | null | undefined,
    country: CountryCode
) {
    if (!value?.trim()) {
        return '';
    }

    return (
        PHONE_VALIDATOR.tryValidate(value, { phoneCountry: country }).value ??
        PHONE_VALIDATOR.formatInput(value, country)
    );
}

export function inferPhoneCountry(value?: string | null) {
    return PHONE_VALIDATOR.inferCountry(value);
}

export function formatStoredPhoneNumber(value?: string | null) {
    if (!value) {
        return '';
    }

    const parsed = parsePhoneNumberFromString(value);
    if (parsed?.isValid()) {
        return formatLocalPhonePresentation(
            parsed.nationalNumber,
            parsed.country
        );
    }

    return formatPhoneDisplay(value, DEFAULT_PHONE_COUNTRY);
}

export function formatPhoneDisplay(value: string, country: CountryCode) {
    const sanitized = PHONE_VALIDATOR.formatInput(value, country);
    return formatPhonePresentation(sanitized, country);
}

export function toEditablePhoneNumber(
    value: string | null | undefined,
    country: CountryCode
) {
    if (!value) {
        return '';
    }

    const parsed = parsePhoneNumberFromString(
        value,
        value.startsWith('+') ? undefined : country
    );
    if (parsed?.isValid()) {
        return parsed.nationalNumber;
    }

    return PHONE_VALIDATOR.formatInput(value, country);
}

function countryFlag(country: string) {
    return String.fromCodePoint(
        ...country
            .toUpperCase()
            .split('')
            .map((char) => 127397 + char.charCodeAt(0))
    );
}

function formatPhonePresentation(value: string, country: CountryCode) {
    if (!value) {
        return '';
    }

    const parsed = parsePhoneNumberFromString(
        value,
        value.startsWith('+') ? undefined : country
    );
    if (parsed?.isValid()) {
        return formatLocalPhonePresentation(
            parsed.nationalNumber,
            parsed.country
        );
    }

    if (country === 'AU') {
        return formatAustralianPhone(value);
    }

    return groupDigits(value.replace(/[^\d+]/g, ''), [3, 3, 3, 3]);
}

function formatAustralianPhone(value: string) {
    if (value.startsWith('+61')) {
        const digits = value.slice(3).replace(/\D/g, '');
        return digits ? `+61 ${groupDigits(digits, [3, 3, 3])}` : '+61';
    }

    const digits = value.replace(/\D/g, '');
    if (!digits) {
        return '';
    }
    if (digits.startsWith('61')) {
        return groupDigits(digits.slice(2), [3, 3, 3]);
    }
    if (digits.startsWith('0')) {
        return groupDigits(digits.slice(1), [3, 3, 3]);
    }
    return groupDigits(digits, [3, 3, 3]);
}

function formatLocalPhonePresentation(
    nationalNumber: string,
    country?: string
) {
    if (country === 'AU') {
        return groupDigits(nationalNumber, [3, 3, 3]);
    }

    return groupDigits(nationalNumber, [3, 3, 3, 3]);
}

function groupDigits(value: string, groups: number[]) {
    const pieces: string[] = [];
    let start = 0;

    for (const length of groups) {
        if (start >= value.length) {
            break;
        }
        pieces.push(value.slice(start, start + length));
        start += length;
    }

    if (start < value.length) {
        pieces.push(value.slice(start));
    }

    return pieces.filter(Boolean).join(' ');
}
