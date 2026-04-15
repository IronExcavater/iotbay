import { NAME_MAX_LENGTH } from '../validation/strings';
import { NameValidator } from '../validation/textual';
import { parseValue, validateValue } from './base';

const FIRST_NAME_VALIDATOR = new NameValidator({
    fieldName: 'First name',
    required: true,
    maxLength: NAME_MAX_LENGTH,
    asciiOnly: true,
    printableAsciiOnly: true,
});
const LAST_NAME_VALIDATOR = new NameValidator({
    fieldName: 'Last name',
    required: true,
    maxLength: NAME_MAX_LENGTH,
    asciiOnly: true,
    printableAsciiOnly: true,
});

abstract class PersonName {
    static readonly MAX_LENGTH = NAME_MAX_LENGTH;

    constructor(readonly value: string) {}
}

export class FirstName extends PersonName {
    static assess(value: string) {
        return FIRST_NAME_VALIDATOR.assess(value);
    }

    static formatInput(value: string) {
        return FIRST_NAME_VALIDATOR.formatInput(value);
    }

    static parse(value: string) {
        return parseValue(this, value, (name) => new FirstName(name));
    }

    static validate(value: string) {
        return validateValue(this, value);
    }

    static validateOnBlur(value: string) {
        return validateNameOnBlur(value, this.validate);
    }
}

export class LastName extends PersonName {
    static assess(value: string) {
        return LAST_NAME_VALIDATOR.assess(value);
    }

    static formatInput(value: string) {
        return LAST_NAME_VALIDATOR.formatInput(value);
    }

    static parse(value: string) {
        return parseValue(this, value, (name) => new LastName(name));
    }

    static validate(value: string) {
        return validateValue(this, value);
    }

    static validateOnBlur(value: string) {
        return validateNameOnBlur(value, this.validate);
    }
}

function validateNameOnBlur(
    value: string,
    validateName: (value: string) => string | null
) {
    const trimmed = value.trim();
    if (!trimmed) {
        return validateName(value);
    }

    return /[ '-]$/.test(trimmed) ? null : validateName(trimmed);
}
