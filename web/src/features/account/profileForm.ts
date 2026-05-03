import type { ProfileValues } from '@features/account/types';
import {
    toAddressInput,
    validateAddressValues,
} from '@features/addresses/form';
import type { UpdateProfileInput, User } from '@features/auth/api';
import {
    getBrowserPhoneCountry,
    inferPhoneCountry,
    normalizeComparablePhoneNumber,
    toEditablePhoneNumber,
    validatePhoneNumber,
} from '@features/auth/phone';
import {
    backendErrorMessage,
    resolveBackendError,
} from '@shared/services/http';
import { collectFieldErrors } from '@shared/validation/forms';
import { Email } from '@shared/value-objects/Email';
import { FirstName, LastName } from '@shared/value-objects/Name';
import { Designation, StaffId } from '@shared/value-objects/Staff';

export type ProfileFieldErrors = Partial<Record<keyof ProfileValues, string>>;

type ProfileUser = Pick<
    User,
    | 'country'
    | 'designation'
    | 'email'
    | 'firstName'
    | 'lastName'
    | 'permission'
    | 'phoneNumber'
    | 'profileImageUrl'
    | 'staffId'
> &
    Partial<
        Pick<
            User,
            | 'addressLineOne'
            | 'addressLineTwo'
            | 'postcode'
            | 'state'
            | 'suburb'
        >
    >;

export const DEFAULT_PROFILE_VALUES: ProfileValues = {
    addressLineOne: '',
    addressLineTwo: '',
    country: '',
    currentPassword: '',
    designation: '',
    email: '',
    firstName: '',
    lastName: '',
    postcode: '',
    permission: '',
    phoneCountry: getBrowserPhoneCountry(),
    phoneNumber: '',
    profileImageUrl: '',
    staffId: '',
    state: '',
    suburb: '',
};

export function toProfileValues(user: ProfileUser): ProfileValues {
    const phoneCountry = user.phoneNumber
        ? inferPhoneCountry(user.phoneNumber)
        : getBrowserPhoneCountry();

    return {
        addressLineOne: user.addressLineOne ?? '',
        addressLineTwo: user.addressLineTwo ?? '',
        country: user.country ?? '',
        currentPassword: '',
        designation: user.designation ?? '',
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        permission: user.permission ?? '',
        phoneCountry,
        phoneNumber: toEditablePhoneNumber(user.phoneNumber, phoneCountry),
        postcode: user.postcode ?? '',
        profileImageUrl: user.profileImageUrl ?? '',
        staffId: user.staffId ?? '',
        state: user.state ?? '',
        suburb: user.suburb ?? '',
    };
}

export function toProfileUpdateInput(
    values: ProfileValues,
    {
        hasChanges,
        isCustomer,
        isStaff,
    }: {
        hasChanges: boolean;
        isCustomer: boolean;
        isStaff: boolean;
    }
): UpdateProfileInput {
    return {
        ...(isCustomer ? toAddressInput(values) : {}),
        currentPassword: hasChanges ? values.currentPassword : undefined,
        designation: isStaff ? values.designation.trim() : '',
        email: values.email.trim(),
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        permission: '',
        phoneCountry: isCustomer ? values.phoneCountry : '',
        phoneNumber: isCustomer ? values.phoneNumber.trim() : '',
        profileImageUrl: values.profileImageUrl,
        staffId: isStaff ? values.staffId.trim() : '',
    };
}

export function validateProfileForm(
    values: ProfileValues,
    {
        hasChanges,
        isCustomer,
        isStaff,
    }: {
        hasChanges: boolean;
        isCustomer: boolean;
        isStaff: boolean;
    }
) {
    const fieldErrors: ProfileFieldErrors = {};

    fieldErrors.email = Email.validate(values.email) || undefined;
    fieldErrors.firstName = FirstName.validate(values.firstName) || undefined;
    fieldErrors.lastName = LastName.validate(values.lastName) || undefined;

    if (isCustomer && values.phoneNumber.trim()) {
        fieldErrors.phoneNumber =
            validatePhoneNumber(values.phoneNumber, values.phoneCountry) ||
            undefined;
    }
    if (isCustomer) {
        Object.assign(fieldErrors, validateAddressValues(values));
    }

    if (isStaff) {
        Object.assign(
            fieldErrors,
            collectFieldErrors<keyof ProfileValues>({
                designation: Designation.assess(values.designation, false),
                staffId: StaffId.assess(values.staffId, false),
            })
        );
    }

    if (hasChanges) {
        fieldErrors.currentPassword = values.currentPassword.trim()
            ? undefined
            : 'Current password is required';
    }

    return fieldErrors;
}

export function hasProfileChanges(
    values: ProfileValues,
    initialValues: ProfileValues
) {
    const normalizedCurrentPhone = normalizeComparablePhoneNumber(
        values.phoneNumber,
        values.phoneCountry
    );
    const normalizedInitialPhone = normalizeComparablePhoneNumber(
        initialValues.phoneNumber,
        initialValues.phoneCountry
    );
    const keys: Array<
        Exclude<
            keyof ProfileValues,
            'currentPassword' | 'phoneCountry' | 'phoneNumber'
        >
    > = [
        'addressLineOne',
        'addressLineTwo',
        'country',
        'designation',
        'email',
        'firstName',
        'lastName',
        'postcode',
        'profileImageUrl',
        'staffId',
        'state',
        'suburb',
    ];

    return (
        values.phoneCountry !== initialValues.phoneCountry ||
        normalizedCurrentPhone !== normalizedInitialPhone ||
        keys.some((key) => values[key] !== initialValues[key])
    );
}

export function toAccountError(error: unknown): {
    fieldErrors: ProfileFieldErrors;
    formError: string | null;
} {
    return resolveBackendError<{
        fieldErrors: ProfileFieldErrors;
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
            CURRENT_PASSWORD_INCORRECT: (backendError) => ({
                fieldErrors: {
                    currentPassword: backendErrorMessage(backendError.code),
                },
                formError: null,
            }),
            CURRENT_PASSWORD_REQUIRED: (backendError) => ({
                fieldErrors: {
                    currentPassword: backendErrorMessage(backendError.code),
                },
                formError: null,
            }),
            EMAIL_EXISTS: (backendError) => ({
                fieldErrors: { email: backendErrorMessage(backendError.code) },
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
        },
        (formError) => ({ fieldErrors: {}, formError })
    );
}
