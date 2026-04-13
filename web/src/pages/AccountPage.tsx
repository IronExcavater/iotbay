import { useEffect, useState, type SubmitEvent } from 'react';
import type { CountryCode } from 'libphonenumber-js';
import { useNavigate } from 'react-router-dom';

import { AddressFields } from '../addresses/AddressFields';
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
import {
    assessDesignation,
    assessPermission,
    assessStaffId,
    EMAIL_MAX_LENGTH,
    NAME_MAX_LENGTH,
    sanitizeDesignation,
    sanitizeEmail,
    sanitizeFirstName,
    sanitizeLastName,
    sanitizePasswordInput,
    sanitizeStaffId,
    STAFF_DESIGNATION_MAX_LENGTH,
    validateEmail,
    validateFirstName,
    validateFirstNameOnBlur,
    validateLastName,
    validateLastNameOnBlur,
    validateRequired,
    STAFF_ID_MAX_LENGTH,
} from '../auth/validation';
import { Button } from '../components/form/Button';
import { Field } from '../components/form/Field';
import { FormNotice } from '../components/form/FormNotice';
import { inputClassName } from '../components/form/Input';
import { PasswordInput } from '../components/form/PasswordInput';
import { PhoneField } from '../components/form/PhoneField';
import { useToast } from '../components/toast/ToastProvider';
import { downloadHtml } from '../services/download';
import { backendErrorMessage, resolveBackendError } from '../services/http';
import { collectFieldErrors } from '../validation/forms';

interface ProfileValues {
    addressLineOne: string;
    addressLineTwo: string;
    country: string;
    currentPassword: string;
    designation: string;
    email: string;
    firstName: string;
    lastName: string;
    postcode: string;
    permission: string;
    phoneCountry: CountryCode;
    phoneNumber: string;
    staffId: string;
    state: string;
    suburb: string;
}

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
        permission: isStaff ? values.permission : '',
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
    const [error, setError] = useState<string | null>(null);
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
        setError(null);

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
            setError(nextErrorState.formError);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className="mx-auto grid max-w-3xl gap-6">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Account
            </h1>

            <section className="rounded border border-slate-200 bg-white p-5">
                <div className="grid gap-1">
                    <h2 className="text-lg font-semibold">Manage details</h2>
                </div>

                <form className="mt-5 grid gap-6" onSubmit={handleSubmit}>
                    {error ? (
                        <FormNotice tone="error">{error}</FormNotice>
                    ) : null}

                    <section className="grid gap-4">
                        <h3 className="text-sm font-semibold tracking-[0.08em] text-slate-700 uppercase">
                            Personal
                        </h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field
                                error={fieldErrors.firstName}
                                label="First name"
                                required
                            >
                                <input
                                    className={inputClassName(
                                        Boolean(fieldErrors.firstName)
                                    )}
                                    maxLength={NAME_MAX_LENGTH}
                                    onBlur={() => {
                                        setFieldError(
                                            'firstName',
                                            validateFirstNameOnBlur(
                                                values.firstName
                                            )
                                        );
                                    }}
                                    onChange={(event) => {
                                        updateValues({
                                            firstName: sanitizeFirstName(
                                                event.target.value
                                            ),
                                        });
                                    }}
                                    placeholder="Jane"
                                    value={values.firstName}
                                />
                            </Field>

                            <Field
                                error={fieldErrors.lastName}
                                label="Last name"
                                required
                            >
                                <input
                                    className={inputClassName(
                                        Boolean(fieldErrors.lastName)
                                    )}
                                    maxLength={NAME_MAX_LENGTH}
                                    onBlur={() => {
                                        setFieldError(
                                            'lastName',
                                            validateLastNameOnBlur(
                                                values.lastName
                                            )
                                        );
                                    }}
                                    onChange={(event) => {
                                        updateValues({
                                            lastName: sanitizeLastName(
                                                event.target.value
                                            ),
                                        });
                                    }}
                                    placeholder="Doe"
                                    value={values.lastName}
                                />
                            </Field>
                        </div>

                        <Field error={fieldErrors.email} label="Email" required>
                            <input
                                className={inputClassName(
                                    Boolean(fieldErrors.email)
                                )}
                                maxLength={EMAIL_MAX_LENGTH}
                                onBlur={() => {
                                    setFieldError(
                                        'email',
                                        validateEmail(values.email)
                                    );
                                }}
                                onChange={(event) => {
                                    updateValues({
                                        email: sanitizeEmail(
                                            event.target.value
                                        ),
                                    });
                                }}
                                placeholder="jane.doe@email.com"
                                type="email"
                                value={values.email}
                            />
                        </Field>
                    </section>

                    {isCustomer ? (
                        <section className="grid gap-4 border-t border-slate-200 pt-6">
                            {/* Show the registered customer's saved contact details here. */}
                            <h3 className="text-sm font-semibold tracking-[0.08em] text-slate-700 uppercase">
                                Contact
                            </h3>
                            <PhoneField
                                country={values.phoneCountry}
                                error={fieldErrors.phoneNumber}
                                label="Phone number"
                                onBlur={handlePhoneBlur}
                                onCountryChange={(country) => {
                                    updateValues({ phoneCountry: country });
                                }}
                                onNumberChange={(value) => {
                                    updateValues({ phoneNumber: value });
                                }}
                                value={values.phoneNumber}
                            />

                            <AddressFields
                                countryCode={values.phoneCountry}
                                errors={fieldErrors}
                                onFieldChange={handleAddressFieldChange}
                                values={values}
                            />
                        </section>
                    ) : null}

                    {isStaff ? (
                        <section className="grid gap-4 border-t border-slate-200 pt-6">
                            {/* Staff accounts expose their saved role details instead of customer contact fields. */}
                            <h3 className="text-sm font-semibold tracking-[0.08em] text-slate-700 uppercase">
                                Staff
                            </h3>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                    error={fieldErrors.staffId}
                                    label="Staff ID"
                                >
                                    <input
                                        className={inputClassName(
                                            Boolean(fieldErrors.staffId)
                                        )}
                                        maxLength={STAFF_ID_MAX_LENGTH}
                                        onChange={(event) => {
                                            setValues((current) => ({
                                                ...current,
                                                staffId: sanitizeStaffId(
                                                    event.target.value
                                                ),
                                            }));
                                        }}
                                        placeholder="STF-001"
                                        value={values.staffId}
                                    />
                                </Field>

                                <Field
                                    error={fieldErrors.designation}
                                    label="Position"
                                >
                                    <input
                                        className={inputClassName(
                                            Boolean(fieldErrors.designation)
                                        )}
                                        maxLength={STAFF_DESIGNATION_MAX_LENGTH}
                                        onChange={(event) => {
                                            updateValues({
                                                designation:
                                                    sanitizeDesignation(
                                                        event.target.value
                                                    ),
                                            });
                                        }}
                                        placeholder="Store manager"
                                        value={values.designation}
                                    />
                                </Field>

                                <Field
                                    error={fieldErrors.permission}
                                    label="Permission"
                                >
                                    <select
                                        aria-label="Permission"
                                        className={inputClassName(
                                            Boolean(fieldErrors.permission)
                                        )}
                                        onChange={(event) => {
                                            updateValues({
                                                permission: event.target.value,
                                            });
                                        }}
                                        title="Permission"
                                        value={values.permission}
                                    >
                                        <option value="">
                                            Select permission
                                        </option>
                                        <option value="admin">Admin</option>
                                        <option value="superadmin">
                                            Superadmin
                                        </option>
                                    </select>
                                </Field>
                            </div>
                        </section>
                    ) : null}

                    <section className="grid min-h-18 gap-3 border-t border-slate-200 pt-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                        {hasChanges ? (
                            <Field
                                error={fieldErrors.currentPassword}
                                hint={currentPasswordHint}
                                label="Password"
                                metaPlacement="inline"
                                required
                            >
                                <PasswordInput
                                    autoComplete="current-password"
                                    hasError={Boolean(
                                        fieldErrors.currentPassword
                                    )}
                                    name="currentPassword"
                                    onBlur={() => {
                                        if (!hasChanges) {
                                            return;
                                        }

                                        setFieldError(
                                            'currentPassword',
                                            validateRequired(
                                                values.currentPassword,
                                                'Current password is required'
                                            )
                                        );
                                    }}
                                    onChange={(event) => {
                                        updateValues({
                                            currentPassword:
                                                sanitizePasswordInput(
                                                    event.target.value
                                                ),
                                        });
                                    }}
                                    onToggle={() => {
                                        setShowCurrentPassword(
                                            (current) => !current
                                        );
                                    }}
                                    placeholder="Enter your password"
                                    showPassword={showCurrentPassword}
                                    value={values.currentPassword}
                                />
                            </Field>
                        ) : (
                            <div className="sm:min-h-18" />
                        )}

                        <div className="flex justify-end sm:self-end">
                            <Button
                                disabled={isSubmitting || !hasChanges}
                                loading={isSubmitting}
                                type="submit"
                                variant="primary"
                            >
                                Save changes
                            </Button>
                        </div>
                    </section>
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
    const emailError = validateEmail(values.email);
    if (emailError) {
        fieldErrors.email = emailError;
    }
    const firstNameError = validateFirstName(values.firstName);
    if (firstNameError) {
        fieldErrors.firstName = firstNameError;
    }
    const lastNameError = validateLastName(values.lastName);
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
                designation: assessDesignation(values.designation, false),
                permission: assessPermission(values.permission),
                staffId: assessStaffId(values.staffId, false),
            })
        );
    }

    if (hasChanges) {
        // Require the current password before allowing saved registration
        // details to be changed on an existing account.
        fieldErrors.currentPassword =
            validateRequired(
                values.currentPassword,
                'Current password is required'
            ) || undefined;
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
        'permission',
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
