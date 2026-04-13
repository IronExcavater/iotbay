import { PasswordValidator, type PasswordRule } from '../validation/passwords';
import {
    ADDRESS_MAX_LENGTH,
    EMAIL_MAX_LENGTH,
    NAME_MAX_LENGTH,
    PASSWORD_MAX_LENGTH,
    STAFF_DESIGNATION_MAX_LENGTH,
    STAFF_ID_MAX_LENGTH,
    StringValidator,
} from '../validation/strings';
import {
    AddressValidator,
    EmailValidator,
    NameValidator,
} from '../validation/textual';

export {
    EMAIL_MAX_LENGTH,
    NAME_MAX_LENGTH,
    PASSWORD_MAX_LENGTH,
    STAFF_ID_MAX_LENGTH,
    STAFF_DESIGNATION_MAX_LENGTH,
};

const EMAIL_VALIDATOR = new EmailValidator({
    fieldName: 'Email',
    required: true,
    maxLength: EMAIL_MAX_LENGTH,
    asciiOnly: true,
    printableAsciiOnly: true,
    lowercase: true,
});
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
const PASSWORD_INPUT_VALIDATOR = new StringValidator({
    fieldName: 'Password',
    maxLength: PASSWORD_MAX_LENGTH,
    asciiOnly: true,
    printableAsciiOnly: true,
});
export const PASSWORD_VALIDATOR = new PasswordValidator({
    fieldName: 'password',
    required: true,
    maxLength: PASSWORD_MAX_LENGTH,
    asciiOnly: true,
    printableAsciiOnly: true,
});

export type { PasswordRule };

export function validateRequired(
    value: string,
    message: string
): string | null {
    return value.trim() ? null : message;
}

export function sanitizeEmail(value: string) {
    return EMAIL_VALIDATOR.formatInput(value);
}

export function sanitizeFirstName(value: string) {
    return FIRST_NAME_VALIDATOR.formatInput(value);
}

export function sanitizeLastName(value: string) {
    return LAST_NAME_VALIDATOR.formatInput(value);
}

export function sanitizePasswordInput(value: string) {
    return PASSWORD_INPUT_VALIDATOR.formatInput(value);
}

export function getPasswordRules(
    password: string,
    context: {
        email?: string;
        firstName?: string;
        lastName?: string;
    } = {}
): PasswordRule[] {
    return PASSWORD_VALIDATOR.requirements(password, {
        email: context.email,
        firstName: context.firstName,
        lastName: context.lastName,
    });
}

export function validateEmail(value: string): string | null {
    const result = EMAIL_VALIDATOR.tryValidate(value);
    return result.error?.message ?? null;
}

export function validateFirstName(value: string): string | null {
    return FIRST_NAME_VALIDATOR.tryValidate(value).error?.message ?? null;
}

export function validateLastName(value: string): string | null {
    return LAST_NAME_VALIDATOR.tryValidate(value).error?.message ?? null;
}

export function validateFirstNameOnBlur(value: string): string | null {
    return validateNameOnBlur(value, validateFirstName);
}

export function validateLastNameOnBlur(value: string): string | null {
    return validateNameOnBlur(value, validateLastName);
}

export function validateAddressField(
    value: string,
    fieldName: string,
    required = false
): string | null {
    const validator = new AddressValidator({
        fieldName,
        maxLength: ADDRESS_MAX_LENGTH,
        asciiOnly: true,
        printableAsciiOnly: true,
        required,
    });
    return validator.tryValidate(value).error?.message ?? null;
}

export function sanitizeAddressField(value: string, fieldName: string) {
    return new AddressValidator({
        fieldName,
        maxLength: ADDRESS_MAX_LENGTH,
        asciiOnly: true,
        printableAsciiOnly: true,
    }).formatInput(value);
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

export function hasSelectedAddress(value: {
    addressLineOne?: string;
    addressLineTwo: string;
    country?: string;
    postcode?: string;
    state?: string;
    suburb?: string;
}) {
    return Boolean(
        value.addressLineOne?.trim() ||
        value.addressLineTwo.trim() ||
        value.suburb?.trim() ||
        value.state?.trim() ||
        value.postcode?.trim() ||
        value.country?.trim()
    );
}
