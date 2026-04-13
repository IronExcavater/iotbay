import {
    type CountryCode,
    parsePhoneNumberFromString,
} from 'libphonenumber-js';

import { StringValidator, type StringValidatorOptions } from './strings';

export const PHONE_NUMBER_MAX_LENGTH = 40;
export const DEFAULT_PHONE_COUNTRY: CountryCode = 'AU';
export const PHONE_COUNTRY_LENGTH = 2;

export class PhoneCountryValidator extends StringValidator {
    override sanitizeInput(value: string, context?: Record<string, unknown>) {
        return super
            .sanitizeInput(value, context)
            .replace(/[^A-Za-z]/g, '')
            .toUpperCase()
            .slice(0, PHONE_COUNTRY_LENGTH);
    }

    override validate(value: string) {
        const normalized = super.validate(value);
        if (normalized && !/^[A-Z]{2}$/.test(normalized)) {
            this.fail('phoneCountry is invalid', 'PHONE_COUNTRY_INVALID');
        }
        return normalized;
    }
}

export class PhoneValidator extends StringValidator {
    constructor(
        options: StringValidatorOptions,
        private readonly defaultCountry: CountryCode
    ) {
        super(options);
    }

    override sanitizeInput(value: string, context?: Record<string, unknown>) {
        const normalized = super.sanitizeInput(value, context);
        let result = '';

        for (const character of normalized) {
            if (/\d/.test(character)) {
                result += character;
                continue;
            }
            if (character === '+' && !result) {
                result += character;
            }
        }

        return this.options.maxLength !== undefined
            ? result.slice(0, this.options.maxLength)
            : result;
    }

    validate(value: string, context: Record<string, unknown> = {}) {
        const normalized = super.validate(value);
        if (!normalized) {
            return normalized;
        }

        const phoneCountry = new PhoneCountryValidator({
            fieldName: 'phoneCountry',
            asciiOnly: true,
            uppercase: true,
        }).validate(
            String(context.phoneCountry ?? this.defaultCountry)
        ) as CountryCode;

        const parsed = parsePhoneNumber(normalized, phoneCountry);
        if (!parsed) {
            this.fail('phone number is invalid', 'PHONE_NUMBER_INVALID');
        }
        return parsed.number;
    }

    override formatInput(value: string, context?: Record<string, unknown>) {
        return this.sanitizeInput(value, context);
    }

    formatStored(value?: string | null) {
        if (!value) {
            return '';
        }
        const parsed = parsePhoneNumberFromString(value);
        if (!parsed) {
            return this.sanitizeInput(value);
        }

        return parsed.formatNational().replace(/[^\d]/g, '');
    }

    inferCountry(value?: string | null) {
        if (!value) {
            return this.defaultCountry;
        }
        return (parsePhoneNumberFromString(value)?.country ??
            this.defaultCountry) as CountryCode;
    }
}

function parsePhoneNumber(value: string, country: CountryCode) {
    // Accept the common local variants users actually type while still
    // normalizing the stored value to E.164.
    for (const candidate of phoneCandidates(value)) {
        const parsed = parsePhoneNumberFromString(
            candidate,
            candidate.startsWith('+') ? undefined : country
        );
        if (parsed?.isValid()) {
            return parsed;
        }
    }

    return null;
}

function phoneCandidates(value: string) {
    if (value.startsWith('+')) {
        return [value];
    }

    const digits = value.replace(/\D/g, '');
    if (!digits) {
        return [];
    }

    const candidates = [digits];
    if (!digits.startsWith('0')) {
        candidates.push(`0${digits}`);
    }
    candidates.push(`+${digits}`);
    return [...new Set(candidates)];
}
