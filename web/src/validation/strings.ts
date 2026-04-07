import { Validator } from './base';

export const EMAIL_MAX_LENGTH = 320;
export const PASSWORD_MAX_LENGTH = 200;
export const TOKEN_MAX_LENGTH = 512;
export const ADDRESS_MAX_LENGTH = 120;
export const NAME_MAX_LENGTH = 100;

const ASCII_VISIBLE = /^[\x20-\x7E]+$/;

export interface StringValidatorOptions {
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

function isAscii(value: string) {
    return [...value].every((character) => character.charCodeAt(0) <= 0x7f);
}
