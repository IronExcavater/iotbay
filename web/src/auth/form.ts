import type { CountryCode } from 'libphonenumber-js';

import { toAddressInput, validateAddressValues } from '../addresses/form';
import { BackendError, normalizeMessage } from '../services/http';
import type { RegisterInput } from './api';
import { PASSWORD_VALIDATOR } from './passwordRules';
import { validatePhoneNumber } from './phone';
import {
    validateEmail,
    validateFirstName,
    validateLastName,
} from './validation';

export type AuthMode = 'signin' | 'signup';

export interface AuthFormValues {
    addressLineOne: string;
    addressLineTwo: string;
    country: string;
    confirmPassword: string;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    postcode: string;
    phoneCountry: CountryCode;
    phoneNumber: string;
    state: string;
    suburb: string;
}

export type AuthFieldName = keyof AuthFormValues;
export type AuthFieldErrors = Partial<Record<AuthFieldName, string>>;

export function parseAuthMode(value: string | null): AuthMode {
    return value === 'signup' ? 'signup' : 'signin';
}

export function validateAuthForm(
    values: AuthFormValues,
    {
        isSignUp,
        passwordRulesMet,
    }: {
        isSignUp: boolean;
        passwordRulesMet: boolean;
    }
) {
    const fieldErrors: AuthFieldErrors = {};
    const emailError = validateEmail(values.email);
    if (emailError) {
        fieldErrors.email = emailError;
    }

    if (!values.password) {
        fieldErrors.password = 'Password is required';
    } else if (isSignUp) {
        const passwordError = PASSWORD_VALIDATOR.tryValidate(values.password, {
            email: values.email,
            firstName: values.firstName,
            lastName: values.lastName,
        }).error?.message;
        if (passwordError) {
            fieldErrors.password = normalizeMessage(passwordError);
        } else if (!passwordRulesMet) {
            fieldErrors.password = 'Password requirements are not met';
        }
    }

    if (!isSignUp) {
        return fieldErrors;
    }

    const firstNameError = validateFirstName(values.firstName);
    if (firstNameError) {
        fieldErrors.firstName = firstNameError;
    }

    const lastNameError = validateLastName(values.lastName);
    if (lastNameError) {
        fieldErrors.lastName = lastNameError;
    }

    const phoneNumberError = values.phoneNumber.trim()
        ? validatePhoneNumber(values.phoneNumber, values.phoneCountry)
        : null;
    if (phoneNumberError) {
        fieldErrors.phoneNumber = phoneNumberError;
    }

    if (!values.confirmPassword) {
        fieldErrors.confirmPassword = 'Confirm password is required';
    } else if (values.confirmPassword !== values.password) {
        fieldErrors.confirmPassword = 'Passwords do not match';
    }

    Object.assign(fieldErrors, validateAddressValues(values));
    return fieldErrors;
}

export function toRegisterInput(values: AuthFormValues): RegisterInput {
    return {
        ...toAddressInput(values),
        email: values.email.trim(),
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        password: values.password,
        phoneCountry: values.phoneCountry,
        phoneNumber: values.phoneNumber.trim(),
    };
}

export function toAuthErrorState(error: unknown, isSignUp: boolean) {
    if (!(error instanceof BackendError)) {
        return {
            fieldErrors: {},
            formError: normalizeMessage('Something went wrong'),
        };
    }

    switch (error.code) {
        case 'EMAIL_EXISTS':
            return {
                fieldErrors: { email: 'Email already exists' },
                formError: null,
            };
        case 'INVALID_CREDENTIALS':
            return {
                fieldErrors: isSignUp
                    ? {}
                    : { password: 'Email or password is incorrect' },
                formError: isSignUp ? 'Email or password is incorrect' : null,
            };
        case 'EMAIL_NOT_VERIFIED':
            return {
                fieldErrors: {},
                formError: 'Check your email to verify your account',
            };
        case 'STAFF_ACCOUNT_REQUIRED':
            return {
                fieldErrors: {},
                formError: 'Staff account is required',
            };
        case 'STAFF_PERMISSION_REQUIRED':
            return {
                fieldErrors: {},
                formError: 'Staff permission is required',
            };
        case 'ADDRESS_INVALID':
            return {
                fieldErrors: { addressLineOne: 'Choose a valid address' },
                formError: null,
            };
        case 'ADDRESS_LOOKUP_UNAVAILABLE':
            return {
                fieldErrors: {},
                formError: 'Address search is unavailable',
            };
        case 'PHONE_NUMBER_INVALID':
        case 'PHONE_COUNTRY_INVALID':
            return {
                fieldErrors: { phoneNumber: 'Phone number is invalid' },
                formError: null,
            };
        case 'PASSWORD_TOO_SHORT':
            return {
                fieldErrors: { password: 'Use at least 8 characters' },
                formError: null,
            };
        case 'PASSWORD_NEEDS_NUMBER_OR_SYMBOL':
            return {
                fieldErrors: { password: 'Include a number or symbol' },
                formError: null,
            };
        case 'PASSWORD_HAS_PERSONAL_INFO':
            return {
                fieldErrors: { password: 'Avoid personal information' },
                formError: null,
            };
        case 'PASSWORD_HAS_COMMON_PATTERN':
            return {
                fieldErrors: { password: 'Avoid common patterns' },
                formError: null,
            };
        default:
            return {
                fieldErrors: {},
                formError: normalizeMessage(error.message),
            };
    }
}
