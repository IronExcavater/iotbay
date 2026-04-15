import {
    PasswordValidator,
    type PasswordRule,
    PASSWORD_MAX_LENGTH,
} from '../validation/passwords';
import { parseValue } from './base';

const PASSWORD_VALIDATOR = new PasswordValidator({
    fieldName: 'password',
    required: true,
    maxLength: PASSWORD_MAX_LENGTH,
    asciiOnly: true,
    printableAsciiOnly: true,
});

export type { PasswordRule };

export class Password {
    static readonly MAX_LENGTH = PASSWORD_MAX_LENGTH;

    constructor(readonly value: string) {}

    static assess(
        value: string,
        context: {
            email?: string;
            firstName?: string;
            lastName?: string;
        } = {}
    ) {
        return PASSWORD_VALIDATOR.assess(value, context);
    }

    static formatInput(value: string) {
        return PASSWORD_VALIDATOR.formatInput(value);
    }

    static parse(
        value: string,
        context: {
            email?: string;
            firstName?: string;
            lastName?: string;
        } = {}
    ) {
        return parseValue(this, value, (password) => new Password(password), context);
    }

    static rules(
        value: string,
        context: {
            email?: string;
            firstName?: string;
            lastName?: string;
        } = {}
    ) {
        return PASSWORD_VALIDATOR.requirements(value, context);
    }
}
