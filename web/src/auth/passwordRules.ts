import {
    PASSWORD_MAX_LENGTH,
    PasswordValidator,
    type PasswordRule,
} from '../validation/core';

interface PasswordContext {
    email?: string;
    firstName?: string;
    lastName?: string;
}

export const PASSWORD_VALIDATOR = new PasswordValidator({
    fieldName: 'password',
    required: true,
    maxLength: PASSWORD_MAX_LENGTH,
    asciiOnly: true,
    printableAsciiOnly: true,
});

export function getPasswordRules(
    password: string,
    context: PasswordContext = {}
): PasswordRule[] {
    return PASSWORD_VALIDATOR.requirements(password, {
        email: context.email,
        firstName: context.firstName,
        lastName: context.lastName,
    });
}

export type { PasswordRule };
