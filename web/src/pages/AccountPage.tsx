import { useEffect, useState, type SubmitEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import {
    AccountActionsSection,
    AccountContactSection,
    AccountPersonalSection,
    AccountStaffSection,
} from '../account/components/AccountFormSections';
import type { ProfileValues } from '../account/types';
import {
    setAddressField,
    type AddressFieldName,
    toAddressInput,
    validateAddressValues,
} from '../addresses/form';
import type { UpdateProfileInput, User } from '../auth/api';
import { useAuth } from '../auth/AuthProvider';
import {
    getBrowserPhoneCountry,
    inferPhoneCountry,
    normalizeComparablePhoneNumber,
    toEditablePhoneNumber,
    validatePhoneNumber,
} from '../auth/phone';
import { buildVerifyEmailPath } from '../auth/redirects';
import { useToast } from '../components/toast/ToastProvider';
import { downloadHtml } from '../services/download';
import { backendErrorMessage, resolveBackendError } from '../services/http';
import { Email } from '../types/Email';
import { FirstName, LastName } from '../types/Name';
import { Designation, StaffId } from '../types/Staff';
import { collectFieldErrors } from '../validation/forms';

type FieldErrors = Partial<Record<keyof ProfileValues, string>>;

const DEFAULT_VALUES: ProfileValues = {
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
    staffId: '',
    state: '',
    suburb: '',
};

function toProfileValues(user: User): ProfileValues {
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
        postcode: user.postcode ?? '',
        permission: user.permission ?? '',
        phoneCountry,
        phoneNumber: toEditablePhoneNumber(user.phoneNumber, phoneCountry),
        state: user.state ?? '',
        suburb: user.suburb ?? '',
        staffId: user.staffId ?? '',
    };
}

function toProfileUpdateInput(
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
    };
}

export default function AccountPage() {
    const navigate = useNavigate();
    const { updateMe, user } = useAuth();
    const { showToast } = useToast();
    const [values, setValues] = useState<ProfileValues>(DEFAULT_VALUES);
    const [initialValues, setInitialValues] =
        useState<ProfileValues>(DEFAULT_VALUES);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);

    useEffect(() => {
        if (!user) return;

        const nextValues = toProfileValues(user);

        setValues(nextValues);
        setInitialValues(nextValues);
    }, [user]);

    const emailChanged = Boolean(
        user && values.email.trim().toLowerCase() !== user.email
    );
    // Customers see the contact details they registered with, while staff see
    // role-specific account metadata instead of customer-only fields.
    const isCustomer = user?.userType === 'customer';
    const isStaff = user?.userType === 'staff';
    const hasChanges = hasProfileChanges(values, initialValues);
    const currentPasswordHint = emailChanged
        ? 'Changing your email will require verification'
        : 'Required to save changes';

    function setFieldError(name: keyof FieldErrors, message?: string | null) {
        setFieldErrors((current) => ({
            ...current,
            [name]: message || undefined,
        }));
    }

    function updateValues(patch: Partial<ProfileValues>) {
        setValues((current) => ({
            ...current,
            ...patch,
        }));
    }

    function handleAddressFieldChange(name: AddressFieldName, value: string) {
        setValues((current) => setAddressField(current, name, value));
    }

    function handlePhoneBlur() {
        setFieldError(
            'phoneNumber',
            values.phoneNumber.trim()
                ? validatePhoneNumber(values.phoneNumber, values.phoneCountry)
                : null
        );
    }

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!hasChanges) return;

        // Validate the edited registration details before sending them to the backend.
        const nextFieldErrors = validateProfileForm(values, {
            hasChanges,
            isCustomer,
            isStaff,
        });

        setFieldErrors(nextFieldErrors);
        if (Object.values(nextFieldErrors).some(Boolean)) return;

        setIsSubmitting(true);
        try {
            const result = await updateMe(
                toProfileUpdateInput(values, {
                    hasChanges,
                    isCustomer,
                    isStaff,
                })
            );

            setFieldErrors({});

            if ('verification' in result) {
                // Changing the saved email address signs the user out and moves
                // them into the verification flow before the update is finalized.
                downloadHtml(result.download);
                navigate(
                    buildVerifyEmailPath({
                        context: 'account',
                        downloaded: Boolean(result.download),
                        email: values.email.trim(),
                        nextPath: '/account',
                        userType: isStaff ? 'staff' : undefined,
                    })
                );
                return;
            }

            const nextValues = {
                ...values,
                currentPassword: '',
            };
            // Treat the saved form state as the new baseline after a successful update.
            setValues(nextValues);
            setInitialValues(nextValues);
            showToast('Account updated');
        } catch (caughtError) {
            const nextErrorState = toAccountError(caughtError);
            setFieldErrors(nextErrorState.fieldErrors);
            if (nextErrorState.formError) showToast(nextErrorState.formError);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className="mx-auto grid max-w-3xl gap-6">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Account
            </h1>

            <section className="bg-ui-0 border-ui-200 rounded border p-5">
                <div className="grid gap-1">
                    <h2 className="text-lg font-semibold">Manage details</h2>
                </div>

                <form className="mt-5 grid gap-6" onSubmit={handleSubmit}>
                    <AccountPersonalSection
                        fieldErrors={fieldErrors}
                        onEmailBlur={() => {
                            setFieldError(
                                'email',
                                Email.validate(values.email)
                            );
                        }}
                        onEmailChange={(value) => {
                            updateValues({ email: Email.formatInput(value) });
                        }}
                        onFirstNameBlur={() => {
                            setFieldError(
                                'firstName',
                                FirstName.validateOnBlur(values.firstName)
                            );
                        }}
                        onFirstNameChange={(value) => {
                            updateValues({
                                firstName: FirstName.formatInput(value),
                            });
                        }}
                        onLastNameBlur={() => {
                            setFieldError(
                                'lastName',
                                LastName.validateOnBlur(values.lastName)
                            );
                        }}
                        onLastNameChange={(value) => {
                            updateValues({
                                lastName: LastName.formatInput(value),
                            });
                        }}
                        values={values}
                    />

                    {isCustomer && (
                        <AccountContactSection
                            errors={fieldErrors}
                            onAddressFieldChange={handleAddressFieldChange}
                            onPhoneBlur={handlePhoneBlur}
                            onPhoneCountryChange={(phoneCountry) => {
                                updateValues({ phoneCountry });
                            }}
                            onPhoneNumberChange={(phoneNumber) => {
                                updateValues({ phoneNumber });
                            }}
                            values={values}
                        />
                    )}

                    {isStaff && (
                        <AccountStaffSection
                            errors={fieldErrors}
                            onDesignationChange={(value) => {
                                updateValues({
                                    designation: Designation.formatInput(value),
                                });
                            }}
                            onStaffIdChange={(value) => {
                                setValues((current) => ({
                                    ...current,
                                    staffId: StaffId.formatInput(value),
                                }));
                            }}
                            values={values}
                        />
                    )}

                    <AccountActionsSection
                        currentPasswordHint={currentPasswordHint}
                        error={fieldErrors.currentPassword}
                        hasChanges={hasChanges}
                        isSubmitting={isSubmitting}
                        onBlur={() => {
                            setFieldError(
                                'currentPassword',
                                values.currentPassword.trim()
                                    ? null
                                    : 'Current password is required'
                            );
                        }}
                        onChange={(value) => {
                            updateValues({ currentPassword: value });
                        }}
                        onSubmitToggle={() => {
                            setShowCurrentPassword((current) => !current);
                        }}
                        showPassword={showCurrentPassword}
                        value={values.currentPassword}
                    />
                </form>
            </section>
        </section>
    );
}

function toAccountError(error: unknown): {
    fieldErrors: FieldErrors;
    formError: string | null;
} {
    return resolveBackendError<{
        fieldErrors: FieldErrors;
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

function validateProfileForm(
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
    const fieldErrors: FieldErrors = {};

    // Re-check the core registration fields so account updates follow the same
    // basic validation rules as the original registration flow.
    const emailError = Email.validate(values.email);
    if (emailError) {
        fieldErrors.email = emailError;
    }
    const firstNameError = FirstName.validate(values.firstName);
    if (firstNameError) {
        fieldErrors.firstName = firstNameError;
    }
    const lastNameError = LastName.validate(values.lastName);
    if (lastNameError) {
        fieldErrors.lastName = lastNameError;
    }

    if (isCustomer && values.phoneNumber.trim()) {
        const phoneError = validatePhoneNumber(
            values.phoneNumber,
            values.phoneCountry
        );
        if (phoneError) {
            fieldErrors.phoneNumber = phoneError;
        }
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
        // Require the current password before allowing saved registration
        // details to be changed on an existing account.
        fieldErrors.currentPassword = values.currentPassword.trim()
            ? undefined
            : 'Current password is required';
    }

    return fieldErrors;
}

function hasProfileChanges(
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
