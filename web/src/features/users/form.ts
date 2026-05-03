import type { ManagedUser, UpdateManagedUserInput } from '@features/users/api';
import {
    backendErrorMessage,
    resolveBackendError,
} from '@shared/services/http';
import { collectFieldErrors, hasFieldErrors } from '@shared/validation/forms';
import { Email } from '@shared/value-objects/Email';
import { FirstName, LastName } from '@shared/value-objects/Name';
import { Designation, Permission, StaffId } from '@shared/value-objects/Staff';

export interface ManagedUserFormValues {
    designation: string;
    email: string;
    firstName: string;
    lastName: string;
    permission: string;
    profileImageUrl: string;
    staffId: string;
}

export type ManagedUserFieldName = keyof ManagedUserFormValues;
export type ManagedUserFieldErrors = Partial<
    Record<ManagedUserFieldName, string>
>;

export function toManagedUserFormValues(
    user: ManagedUser
): ManagedUserFormValues {
    return {
        designation: user.designation ?? '',
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        permission: user.permission ?? 'admin',
        profileImageUrl: user.profileImageUrl ?? '',
        staffId: user.staffId ?? '',
    };
}

export function formatManagedUserField(
    name: ManagedUserFieldName,
    value: string
) {
    switch (name) {
        case 'designation':
            return Designation.formatInput(value);
        case 'email':
            return Email.formatInput(value);
        case 'firstName':
            return FirstName.formatInput(value);
        case 'lastName':
            return LastName.formatInput(value);
        case 'permission':
            return value;
        case 'profileImageUrl':
            return value;
        case 'staffId':
            return StaffId.formatInput(value);
    }
}

export function assessManagedUserForm(
    values: ManagedUserFormValues,
    isStaff: boolean
) {
    const email = Email.assess(values.email);
    const firstName = FirstName.assess(values.firstName);
    const lastName = LastName.assess(values.lastName);
    const designation = Designation.assess(values.designation, false);
    const permission = Permission.assess(values.permission, isStaff);
    const staffId = StaffId.assess(values.staffId, false);
    const fieldErrors = collectFieldErrors<ManagedUserFieldName>({
        designation: isStaff ? designation : null,
        email,
        firstName,
        lastName,
        permission: isStaff ? permission : null,
        staffId: isStaff ? staffId : null,
    });

    if (hasFieldErrors(fieldErrors)) {
        return { fieldErrors, payload: null };
    }

    return {
        fieldErrors,
        payload: {
            designation: isStaff ? (designation.value ?? '') : '',
            email: email.value ?? '',
            firstName: firstName.value ?? '',
            lastName: lastName.value ?? '',
            permission: isStaff ? (permission.value ?? '') : '',
            profileImageUrl: values.profileImageUrl,
            staffId: isStaff ? (staffId.value ?? '') : '',
        } satisfies UpdateManagedUserInput,
    };
}

export function toManagedUserErrorState(error: unknown) {
    return resolveBackendError<{
        fieldErrors: ManagedUserFieldErrors;
        formError: string | null;
    }>(
        error,
        {
            EMAIL_EXISTS: (backendError) => ({
                fieldErrors: { email: backendErrorMessage(backendError.code) },
                formError: null,
            }),
            STAFF_PERMISSION_REQUIRED: (backendError) => ({
                fieldErrors: {},
                formError: backendErrorMessage(backendError.code),
            }),
            USER_MANAGEMENT_NOT_ALLOWED: (backendError) => ({
                fieldErrors: {},
                formError: backendErrorMessage(backendError.code),
            }),
            USER_NOT_FOUND: (backendError) => ({
                fieldErrors: {},
                formError: backendErrorMessage(backendError.code),
            }),
            USER_PERMISSION_ESCALATION_NOT_ALLOWED: (backendError) => ({
                fieldErrors: {
                    permission: backendErrorMessage(backendError.code),
                },
                formError: null,
            }),
        },
        (formError) => ({ fieldErrors: {}, formError })
    );
}
