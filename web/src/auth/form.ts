import type { CountryCode } from 'libphonenumber-js';

import { toAddressInput, validateAddressValues } from '../addresses/form';
import {
    backendErrorMessage,
    normalizeMessage,
    resolveBackendError,
} from '../services/http';
import type { RegisterInput } from './api';
import { validatePhoneNumber } from './phone';
import {
    PASSWORD_VALIDATOR,
    validateEmail,
    validateFirstName,
    validateLastName,
} from './validation';

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
    // Sign-in and sign-up share one screen, but sign-up needs the extra field
    // set and stronger client-side validation before the request is sent.
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
    // Backend error codes map back into either field errors or form-level
    // errors so each screen can stay declarative about how it renders them.
    return resolveBackendError<{
        fieldErrors: AuthFieldErrors;
        formError: string | null;
    }>(
        error,
        {
            ADDRESS_INVALID: (backendError) => ({
                fieldErrors: {
                    addressLineOne: backendErrorMessage(backendError.code),
                },
                formError: null,
            }),
            ADDRESS_LOOKUP_UNAVAILABLE: (backendError) => ({
                fieldErrors: {},
                formError: backendErrorMessage(backendError.code),
            }),
            EMAIL_EXISTS: (backendError) => ({
                fieldErrors: { email: backendErrorMessage(backendError.code) },
                formError: null,
            }),
            EMAIL_NOT_VERIFIED: (backendError) => ({
                fieldErrors: {},
                formError: backendErrorMessage(backendError.code),
            }),
            INVALID_CREDENTIALS: (backendError) => ({
                fieldErrors: isSignUp
                    ? {}
                    : { password: backendErrorMessage(backendError.code) },
                formError: isSignUp
                    ? backendErrorMessage(backendError.code)
                    : null,
            }),
            PASSWORD_HAS_COMMON_PATTERN: (backendError) => ({
                fieldErrors: {
                    password: backendErrorMessage(backendError.code),
                },
                formError: null,
            }),
            PASSWORD_HAS_PERSONAL_INFO: (backendError) => ({
                fieldErrors: {
                    password: backendErrorMessage(backendError.code),
                },
                formError: null,
            }),
            PASSWORD_NEEDS_NUMBER_OR_SYMBOL: (backendError) => ({
                fieldErrors: {
                    password: backendErrorMessage(backendError.code),
                },
                formError: null,
            }),
            PASSWORD_TOO_SHORT: (backendError) => ({
                fieldErrors: {
                    password: backendErrorMessage(backendError.code),
                },
                formError: null,
            }),
            PHONE_COUNTRY_INVALID: (backendError) => ({
                fieldErrors: {
                    phoneNumber: backendErrorMessage(backendError.code),
                },
                formError: null,
            }),
            PHONE_NUMBER_INVALID: (backendError) => ({
                fieldErrors: {
                    phoneNumber: backendErrorMessage(backendError.code),
                },
                formError: null,
            }),
            STAFF_ACCOUNT_REQUIRED: (backendError) => ({
                fieldErrors: {},
                formError: backendErrorMessage(backendError.code),
            }),
            STAFF_PERMISSION_REQUIRED: (backendError) => ({
                fieldErrors: {},
                formError: backendErrorMessage(backendError.code),
            }),
        },
        (formError) => ({
            fieldErrors: {},
            formError,
        })
    );
}
