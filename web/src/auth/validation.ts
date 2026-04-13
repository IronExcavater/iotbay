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
    ChoiceValidator,
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
const DESIGNATION_VALIDATOR = new StringValidator({
    fieldName: 'Position',
    required: true,
    maxLength: STAFF_DESIGNATION_MAX_LENGTH,
    asciiOnly: true,
    printableAsciiOnly: true,
});
const STAFF_ID_VALIDATOR = new StringValidator({
    fieldName: 'Staff ID',
    required: true,
    maxLength: STAFF_ID_MAX_LENGTH,
    asciiOnly: true,
    printableAsciiOnly: true,
    uppercase: true,
});
const OPTIONAL_STAFF_ID_VALIDATOR = new StringValidator({
    fieldName: 'Staff ID',
    maxLength: STAFF_ID_MAX_LENGTH,
    asciiOnly: true,
    printableAsciiOnly: true,
    uppercase: true,
});
const OPTIONAL_DESIGNATION_VALIDATOR = new StringValidator({
    fieldName: 'Position',
    maxLength: STAFF_DESIGNATION_MAX_LENGTH,
    asciiOnly: true,
    printableAsciiOnly: true,
});
const OPTIONAL_PERMISSION_VALIDATOR = new ChoiceValidator(
    {
        fieldName: 'Permission',
    },
    ['admin', 'superadmin']
);
const REQUIRED_PERMISSION_VALIDATOR = new ChoiceValidator(
    {
        fieldName: 'Permission',
        required: true,
    },
    ['admin', 'superadmin']
);
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

export function sanitizeStaffId(value: string) {
    return OPTIONAL_STAFF_ID_VALIDATOR.formatInput(value);
}

export function sanitizeDesignation(value: string) {
    return OPTIONAL_DESIGNATION_VALIDATOR.formatInput(value);
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

export function assessEmail(value: string) {
    return EMAIL_VALIDATOR.assess(value);
}

export function assessFirstName(value: string) {
    return FIRST_NAME_VALIDATOR.assess(value);
}

export function assessLastName(value: string) {
    return LAST_NAME_VALIDATOR.assess(value);
}

export function assessPassword(
    value: string,
    context: {
        email?: string;
        firstName?: string;
        lastName?: string;
    } = {}
) {
    return PASSWORD_VALIDATOR.assess(value, context);
}

export function assessStaffId(value: string, required = true) {
    return (required ? STAFF_ID_VALIDATOR : OPTIONAL_STAFF_ID_VALIDATOR).assess(
        value
    );
}

export function assessDesignation(value: string, required = true) {
    return (
        required ? DESIGNATION_VALIDATOR : OPTIONAL_DESIGNATION_VALIDATOR
    ).assess(value);
}

export function assessPermission(value: string, required = false) {
    return (
        required ? REQUIRED_PERMISSION_VALIDATOR : OPTIONAL_PERMISSION_VALIDATOR
    ).assess(value);
}

export function validateEmail(value: string): string | null {
    return assessEmail(value).error;
}

export function validateFirstName(value: string): string | null {
    return assessFirstName(value).error;
}

export function validateLastName(value: string): string | null {
    return assessLastName(value).error;
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
    return validator.assess(value).error;
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
