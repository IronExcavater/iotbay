import { EMAIL_MAX_LENGTH } from '../validation/strings';
import { EmailValidator } from '../validation/textual';
import { parseValue, validateValue } from './base';

const EMAIL_VALIDATOR = new EmailValidator({
    fieldName: 'Email',
    required: true,
    maxLength: EMAIL_MAX_LENGTH,
    asciiOnly: true,
    printableAsciiOnly: true,
    lowercase: true,
});

export class Email {
    static readonly MAX_LENGTH = EMAIL_MAX_LENGTH;

    constructor(readonly value: string) {}

    static assess(value: string) {
        return EMAIL_VALIDATOR.assess(value);
    }

    static formatInput(value: string) {
        return EMAIL_VALIDATOR.formatInput(value);
    }

    static parse(value: string) {
        return parseValue(this, value, (email) => new Email(email));
    }

    static validate(value: string) {
        return validateValue(this, value);
    }
}
