import {
    type CountryCode,
    parsePhoneNumberFromString,
} from 'libphonenumber-js';
import { DateTime } from 'luxon';

export const EMAIL_MAX_LENGTH = 320;
export const PASSWORD_MAX_LENGTH = 200;
export const PHONE_NUMBER_MAX_LENGTH = 40;
export const TOKEN_MAX_LENGTH = 512;
export const ADDRESS_MAX_LENGTH = 120;
export const NAME_MAX_LENGTH = 100;
export const DEFAULT_PHONE_COUNTRY: CountryCode = 'AU';
export const PHONE_COUNTRY_LENGTH = 2;

const ASCII_VISIBLE = /^[\x20-\x7E]+$/;
const EMAIL_PATTERN =
    /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;
const NAME_PATTERN = /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;

const PASSWORD_MIN_LENGTH = 8;
const PERSONAL_INFO_MIN_LENGTH = 3;
const REPEAT_LENGTH = 3;
const SEQUENCE_LENGTH = 4;
const KEYBOARD_ROWS = [
    'abcdefghijklmnopqrstuvwxyz',
    'qwertyuiop[]\\',
    'QWERTYUIOP{}|',
    "asdfghjkl;'",
    'ASDFGHJKL:',
    'zxcvbnm,./',
    'ZXCVBNM<>?',
    '`1234567890-=',
    '~!@#$%^&*()_+',
];

export interface ValidationIssue {
    code?: string;
    message: string;
}

export class ValidationError extends Error {
    code?: string;

    constructor(issue: ValidationIssue) {
        super(issue.message);
        this.code = issue.code;
        this.name = 'ValidationError';
    }
}

export abstract class Validator<TInput, TOutput = TInput> {
    abstract validate(
        value: TInput,
        context?: Record<string, unknown>
    ): TOutput;

    tryValidate(value: TInput, context?: Record<string, unknown>) {
        try {
            return { error: null, value: this.validate(value, context) };
        } catch (error) {
            if (error instanceof ValidationError) {
                return { error: error, value: null };
            }
            throw error;
        }
    }

    protected fail(message: string, code?: string): never {
        throw new ValidationError({ code, message });
    }
}

interface StringValidatorOptions {
    asciiOnly?: boolean;
    fieldName: string;
    invalidCode?: string;
    lowercase?: boolean;
    maxLength?: number;
    printableAsciiOnly?: boolean;
    required?: boolean;
    requiredCode?: string;
    tooLongCode?: string;
    uppercase?: boolean;
}

export class StringValidator extends Validator<string, string> {
    constructor(protected readonly options: StringValidatorOptions) {
        super();
    }

    sanitizeInput(value: string) {
        let normalized = value;
        if (this.options.asciiOnly) {
            normalized = [...normalized]
                .filter((character) => isAscii(character))
                .join('');
        }
        if (this.options.printableAsciiOnly) {
            normalized = [...normalized]
                .filter((character) => ASCII_VISIBLE.test(character))
                .join('');
        }
        if (this.options.lowercase) {
            normalized = normalized.toLowerCase();
        }
        if (this.options.uppercase) {
            normalized = normalized.toUpperCase();
        }
        if (this.options.maxLength !== undefined) {
            normalized = normalized.slice(0, this.options.maxLength);
        }
        return normalized;
    }

    formatInput(value: string) {
        return this.sanitizeInput(value);
    }

    validate(value: string) {
        let normalized = this.sanitizeInput(value).trim();
        if (!normalized) {
            if (this.options.required) {
                this.fail(
                    `${this.options.fieldName} is required`,
                    this.options.requiredCode
                );
            }
            return '';
        }

        if (
            this.options.maxLength !== undefined &&
            normalized.length > this.options.maxLength
        ) {
            this.fail(
                `${this.options.fieldName} must be ${this.options.maxLength} characters or fewer`,
                this.options.tooLongCode
            );
        }
        if (this.options.asciiOnly && !isAscii(normalized)) {
            this.fail(
                `${this.options.fieldName} must use ASCII characters only`,
                this.options.invalidCode
            );
        }
        if (
            this.options.printableAsciiOnly &&
            !ASCII_VISIBLE.test(normalized)
        ) {
            this.fail(
                `${this.options.fieldName} contains invalid characters`,
                this.options.invalidCode
            );
        }
        if (this.options.lowercase) {
            normalized = normalized.toLowerCase();
        }
        if (this.options.uppercase) {
            normalized = normalized.toUpperCase();
        }
        return normalized;
    }
}

export class ChoiceValidator extends StringValidator {
    constructor(
        options: StringValidatorOptions,
        private readonly choices: readonly string[]
    ) {
        super(options);
    }

    override validate(value: string) {
        const normalized = super.validate(value);
        if (normalized && !this.choices.includes(normalized)) {
            this.fail(`${this.options.fieldName} is invalid`);
        }
        return normalized;
    }
}

export class EmailValidator extends StringValidator {
    override sanitizeInput(value: string) {
        return super
            .sanitizeInput(value)
            .replace(/\s+/g, '')
            .replace(/[^A-Za-z0-9.!#$%&'*+/=?^_`{|}~@-]/g, '')
            .toLowerCase();
    }

    override validate(value: string) {
        const normalized = super.validate(value);
        if (normalized && !EMAIL_PATTERN.test(normalized)) {
            this.fail(`${this.options.fieldName} must be valid`);
        }
        return normalized;
    }
}

export class NameValidator extends StringValidator {
    override sanitizeInput(value: string) {
        return super.sanitizeInput(value).replace(/[^A-Za-z' -]/g, '');
    }

    override validate(value: string) {
        const normalized = super.validate(value);
        if (normalized && !NAME_PATTERN.test(normalized)) {
            this.fail(
                `${this.options.fieldName} must use letters, spaces, apostrophes or hyphens`
            );
        }
        return normalized;
    }
}

export class AddressValidator extends StringValidator {
    override sanitizeInput(value: string) {
        return super
            .sanitizeInput(value)
            .replace(/[^A-Za-z0-9 /#.,:&'()-]/g, '');
    }
}

export class NumberValidator<TInput = number> extends Validator<
    TInput,
    number
> {
    constructor(
        protected readonly fieldName: string,
        protected readonly options: {
            max?: number;
            min?: number;
        } = {}
    ) {
        super();
    }

    validate(value: TInput) {
        return this.validateNumber(this.toNumber(value));
    }

    protected toNumber(value: TInput): number {
        if (typeof value !== 'number') {
            this.fail(this.invalidTypeMessage());
        }
        return value;
    }

    protected validateNumber(value: number) {
        if (!Number.isInteger(value)) {
            this.fail(this.invalidTypeMessage());
        }
        if (this.options.min !== undefined && value < this.options.min) {
            this.fail(this.tooSmallMessage());
        }
        if (this.options.max !== undefined && value > this.options.max) {
            this.fail(this.tooLargeMessage());
        }
        return value;
    }

    protected invalidTypeMessage() {
        return `${this.fieldName} must be an integer`;
    }

    protected tooSmallMessage() {
        return `${this.fieldName} must be at least ${this.options.min}`;
    }

    protected tooLargeMessage() {
        return `${this.fieldName} must be ${this.options.max} or fewer`;
    }
}

export class MoneyValidator extends NumberValidator<string> {
    constructor(
        fieldName: string,
        options: {
            maxCents: number;
        }
    ) {
        super(fieldName, { min: 0, max: options.maxCents });
    }

    formatInput(value: string) {
        const sanitized = value.replace(/[^\d.,]/g, '');
        const separatorIndex = sanitized.search(/[.,]/);
        if (separatorIndex < 0) {
            return sanitized;
        }

        const integerPart = sanitized
            .slice(0, separatorIndex)
            .replace(/[.,]/g, '');
        const fractionalPart = sanitized
            .slice(separatorIndex + 1)
            .replace(/[.,]/g, '')
            .slice(0, 2);
        const separator = sanitized[separatorIndex] === ',' ? ',' : '.';

        return fractionalPart
            ? `${integerPart}${separator}${fractionalPart}`
            : `${integerPart}${separator}`;
    }

    protected override toNumber(value: string) {
        const normalized = this.formatInput(value).replace(',', '.');
        if (!normalized) {
            this.fail(`${this.fieldName} is required`);
        }
        if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
            this.fail(`${this.fieldName} must be in dollars`);
        }

        const [dollars, cents = ''] = normalized.split('.');
        const valueInCents =
            Number.parseInt(dollars, 10) * 100 +
            Number.parseInt(cents.padEnd(2, '0'), 10);

        if (!Number.isSafeInteger(valueInCents)) {
            this.fail(`${this.fieldName} is invalid`);
        }
        return valueInCents;
    }

    protected override tooSmallMessage() {
        return `${this.fieldName} must be zero or greater`;
    }

    protected override tooLargeMessage() {
        return `${this.fieldName} is too large`;
    }
}

export class DateValidator extends StringValidator {
    override validate(value: string) {
        const normalized = super.validate(value);
        if (normalized && !DateTime.fromISO(normalized).isValid) {
            this.fail(`${this.options.fieldName} must be a valid date`);
        }
        return normalized;
    }
}

export class DateTimeValidator extends StringValidator {
    override validate(value: string) {
        const normalized = super.validate(value);
        if (normalized && !DateTime.fromISO(normalized).isValid) {
            this.fail(`${this.options.fieldName} must be a valid datetime`);
        }
        return normalized;
    }
}

export interface PasswordRule {
    label: string;
    met: boolean;
}

export class PasswordValidator extends StringValidator {
    validate(value: string, context: Record<string, unknown> = {}) {
        const normalized = super.validate(value);
        if (normalized.length < PASSWORD_MIN_LENGTH) {
            this.fail(
                'password must be at least 8 characters',
                'PASSWORD_TOO_SHORT'
            );
        }
        if (!hasNumberOrSymbol(normalized)) {
            this.fail(
                'password must include a number or symbol',
                'PASSWORD_NEEDS_NUMBER_OR_SYMBOL'
            );
        }
        if (
            containsPersonalInfo(normalized, {
                email: String(context.email ?? ''),
                firstName: String(context.firstName ?? ''),
                lastName: String(context.lastName ?? ''),
            })
        ) {
            this.fail(
                'password must not contain personal information',
                'PASSWORD_HAS_PERSONAL_INFO'
            );
        }
        if (hasCommonPattern(normalized)) {
            this.fail(
                'password contains a common pattern',
                'PASSWORD_HAS_COMMON_PATTERN'
            );
        }
        return normalized;
    }

    requirements(value: string, context: Record<string, unknown> = {}) {
        return [
            {
                label: 'At least 8 characters',
                met: value.length >= PASSWORD_MIN_LENGTH,
            },
            {
                label: 'A number or symbol',
                met: hasNumberOrSymbol(value),
            },
            {
                label: 'No personal information',
                met: !containsPersonalInfo(value, {
                    email: String(context.email ?? ''),
                    firstName: String(context.firstName ?? ''),
                    lastName: String(context.lastName ?? ''),
                }),
            },
            {
                label: 'No common patterns',
                met: !hasCommonPattern(value),
            },
        ] satisfies PasswordRule[];
    }
}

export class PhoneCountryValidator extends StringValidator {
    override sanitizeInput(value: string) {
        return super
            .sanitizeInput(value)
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

    override sanitizeInput(value: string) {
        const normalized = super.sanitizeInput(value);
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

    override formatInput(value: string, country?: CountryCode) {
        void country;
        return this.sanitizeInput(value);
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

function hasNumberOrSymbol(password: string) {
    return [...password].some(
        (character) => /\d/.test(character) || /\W|_/.test(character)
    );
}

function containsPersonalInfo(
    password: string,
    context: {
        email?: string;
        firstName?: string;
        lastName?: string;
    }
) {
    const canonicalPassword = canonicaliseForPersonalInfo(password);
    if (!canonicalPassword) {
        return false;
    }

    return [...getPersonalTerms(context)].some((term) =>
        canonicalPassword.includes(term)
    );
}

function getPersonalTerms({
    email = '',
    firstName = '',
    lastName = '',
}: {
    email?: string;
    firstName?: string;
    lastName?: string;
}) {
    const terms = new Set<string>();
    const emailLocalPart = email.split('@')[0] ?? '';

    for (const rawValue of [emailLocalPart, firstName, lastName]) {
        for (const part of splitTerms(rawValue)) {
            terms.add(part);
        }
    }

    const nameParts = splitTerms(firstName);
    const surnameParts = splitTerms(lastName);
    if (nameParts.length > 0 && surnameParts.length > 0) {
        terms.add([...nameParts, ...surnameParts].join(''));
        terms.add([...surnameParts, ...nameParts].join(''));
    }

    return terms;
}

function hasCommonPattern(password: string) {
    const canonicalPassword = canonicaliseForPatternMatch(password);
    return (
        hasRepeatedCharacters(canonicalPassword) ||
        hasRepeatedChunks(canonicalPassword) ||
        hasSequence(canonicalPassword) ||
        hasKeyboardSequence(canonicalPassword)
    );
}

function canonicaliseForPersonalInfo(value: string) {
    const substitutions: Record<string, string> = {
        '0': 'o',
        '1': 'i',
        '3': 'e',
        '4': 'a',
        '5': 's',
        '7': 't',
        '@': 'a',
        $: 's',
        '!': 'i',
        '+': 't',
    };

    return [...value.toLowerCase()]
        .map((character) => substitutions[character] ?? character)
        .join('')
        .replace(/[^a-z0-9]/g, '');
}

function canonicaliseForPatternMatch(value: string) {
    return value.toLowerCase().replace(/\s+/g, '');
}

function splitTerms(value: string) {
    return value
        .split(/[\s@._-]+/)
        .map(canonicaliseForPersonalInfo)
        .filter((term) => term.length >= PERSONAL_INFO_MIN_LENGTH);
}

function hasRepeatedCharacters(value: string) {
    let repeats = 1;

    for (let index = 1; index < value.length; index += 1) {
        repeats = value[index] === value[index - 1] ? repeats + 1 : 1;
        if (repeats >= REPEAT_LENGTH) {
            return true;
        }
    }

    return false;
}

function hasRepeatedChunks(value: string) {
    for (let size = 1; size <= Math.floor(value.length / 2); size += 1) {
        if (value.length % size !== 0) {
            continue;
        }

        const chunk = value.slice(0, size);
        if (chunk.repeat(value.length / size) === value) {
            return true;
        }
    }

    return false;
}

function hasSequence(value: string) {
    for (let start = 0; start <= value.length - SEQUENCE_LENGTH; start += 1) {
        const window = value.slice(start, start + SEQUENCE_LENGTH);
        if (isStepSequence(window, 1) || isStepSequence(window, -1)) {
            return true;
        }
    }

    return false;
}

function isStepSequence(value: string, step: number) {
    for (let index = 0; index < value.length - 1; index += 1) {
        if (value.charCodeAt(index + 1) - value.charCodeAt(index) !== step) {
            return false;
        }
    }

    return true;
}

function hasKeyboardSequence(value: string) {
    return KEYBOARD_ROWS.some(
        (row) =>
            containsSequence(row, value) ||
            containsSequence([...row].reverse().join(''), value)
    );
}

function containsSequence(source: string, value: string) {
    for (let start = 0; start <= value.length - SEQUENCE_LENGTH; start += 1) {
        if (source.includes(value.slice(start, start + SEQUENCE_LENGTH))) {
            return true;
        }
    }

    return false;
}

function isAscii(value: string) {
    return [...value].every((character) => character.charCodeAt(0) <= 0x7f);
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
