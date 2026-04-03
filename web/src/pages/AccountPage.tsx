import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { CountryCode } from 'libphonenumber-js';
import { Navigate, useNavigate } from 'react-router-dom';

import { AddressFields } from '../addresses/AddressFields';
import {
    setAddressField,
    toAddressInput,
    validateAddressValues,
} from '../addresses/form';
import { useAuth } from '../auth/AuthProvider';
import {
    EMAIL_MAX_LENGTH,
    NAME_MAX_LENGTH,
    STAFF_DESIGNATION_MAX_LENGTH,
} from '../auth/limits';
import {
    getBrowserPhoneCountry,
    inferPhoneCountry,
    normalizeComparablePhoneNumber,
    toEditablePhoneNumber,
    validatePhoneNumber,
} from '../auth/phone';
import {
    sanitizeEmail,
    sanitizeFirstName,
    sanitizeLastName,
    sanitizePasswordInput,
    validateEmail,
    validateFirstName,
    validateFirstNameOnBlur,
    validateLastName,
    validateLastNameOnBlur,
    validateRequired,
} from '../auth/validation';
import { Button } from '../components/form/Button';
import { Field } from '../components/form/Field';
import { FormNotice } from '../components/form/FormNotice';
import { inputClassName } from '../components/form/Input';
import { PasswordInput } from '../components/form/PasswordInput';
import { PhoneField } from '../components/form/PhoneField';
import { useEnterSubmit } from '../components/form/useEnterSubmit';
import { useToast } from '../components/toast/ToastProvider';
import { downloadHtml } from '../services/download';
import { backendErrorMessage, resolveBackendError } from '../services/http';

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
    state: '',
    suburb: '',
};

export default function AccountPage() {
    const formRef = useRef<HTMLFormElement | null>(null);
    const navigate = useNavigate();
    const { isAuthenticated, isLoading, updateMe, user } = useAuth();
    const { showToast } = useToast();
    const [values, setValues] = useState<ProfileValues>(DEFAULT_VALUES);
    const [initialValues, setInitialValues] =
        useState<ProfileValues>(DEFAULT_VALUES);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);

    useEffect(() => {
        if (!user) {
            return;
        }

        const phoneCountry = user.phoneNumber
            ? inferPhoneCountry(user.phoneNumber)
            : getBrowserPhoneCountry();

        const nextValues = {
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
        };
        setValues(nextValues);
        setInitialValues(nextValues);
    }, [user]);

    if (!isLoading && !isAuthenticated) {
        return <Navigate replace to="/auth?mode=signin" />;
    }

    const emailChanged = Boolean(
        user && values.email.trim().toLowerCase() !== user.email
    );
    const isCustomer = user?.userType === 'customer';
    const isStaff = user?.userType === 'staff';
    const hasChanges = hasProfileChanges(values, initialValues);
    const enterSubmit = useEnterSubmit({
        canSubmit: () =>
            hasChanges &&
            !isSubmitting &&
            Object.values(
                validateProfileForm(values, {
                    hasChanges,
                    isCustomer,
                })
            ).every((error) => !error),
        formRef,
    });

    function setFieldError(name: keyof FieldErrors, message?: string | null) {
        setFieldErrors((current) => ({
            ...current,
            [name]: message || undefined,
        }));
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);

        if (!hasChanges) {
            return;
        }

        const nextFieldErrors = validateProfileForm(values, {
            hasChanges,
            isCustomer,
        });

        setFieldErrors(nextFieldErrors);
        if (Object.values(nextFieldErrors).some(Boolean)) {
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await updateMe({
                ...(isCustomer ? toAddressInput(values) : {}),
                currentPassword: hasChanges
                    ? values.currentPassword
                    : undefined,
                designation: isStaff ? values.designation.trim() : '',
                email: values.email.trim(),
                firstName: values.firstName.trim(),
                lastName: values.lastName.trim(),
                permission: isStaff ? values.permission : '',
                phoneCountry: isCustomer ? values.phoneCountry : '',
                phoneNumber: isCustomer ? values.phoneNumber.trim() : '',
            });

            setFieldErrors({});
            if ('verification' in result) {
                downloadHtml(result.download);
                navigate(
                    `/verify-email?email=${encodeURIComponent(values.email.trim())}&context=account${isStaff ? '&userType=staff' : ''}${result.download ? '&downloaded=1' : ''}`
                );
                return;
            }

            const nextValues = {
                ...values,
                currentPassword: '',
            };
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

                <form
                    className="mt-5 grid gap-6"
                    onKeyDown={enterSubmit.onKeyDown}
                    onSubmit={handleSubmit}
                    ref={formRef}
                >
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
                                        setValues((current) => ({
                                            ...current,
                                            firstName: sanitizeFirstName(
                                                event.target.value
                                            ),
                                        }));
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
                                        setValues((current) => ({
                                            ...current,
                                            lastName: sanitizeLastName(
                                                event.target.value
                                            ),
                                        }));
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
                                    setValues((current) => ({
                                        ...current,
                                        email: sanitizeEmail(
                                            event.target.value
                                        ),
                                    }));
                                }}
                                placeholder="jane.doe@email.com"
                                type="email"
                                value={values.email}
                            />
                        </Field>
                    </section>

                    {isCustomer ? (
                        <section className="grid gap-4 border-t border-slate-200 pt-6">
                            <h3 className="text-sm font-semibold tracking-[0.08em] text-slate-700 uppercase">
                                Contact
                            </h3>
                            <PhoneField
                                country={values.phoneCountry}
                                error={fieldErrors.phoneNumber}
                                label="Phone number"
                                onBlur={() => {
                                    setFieldError(
                                        'phoneNumber',
                                        values.phoneNumber.trim()
                                            ? validatePhoneNumber(
                                                  values.phoneNumber,
                                                  values.phoneCountry
                                              )
                                            : null
                                    );
                                }}
                                onCountryChange={(country) => {
                                    setValues((current) => ({
                                        ...current,
                                        phoneCountry: country,
                                    }));
                                }}
                                onNumberChange={(value) => {
                                    setValues((current) => ({
                                        ...current,
                                        phoneNumber: value,
                                    }));
                                }}
                                value={values.phoneNumber}
                            />

                            <AddressFields
                                countryCode={values.phoneCountry}
                                errors={fieldErrors}
                                onFieldChange={(name, value) => {
                                    setValues((current) =>
                                        setAddressField(current, name, value)
                                    );
                                }}
                                values={values}
                            />
                        </section>
                    ) : null}

                    {isStaff ? (
                        <section className="grid gap-4 border-t border-slate-200 pt-6">
                            <h3 className="text-sm font-semibold tracking-[0.08em] text-slate-700 uppercase">
                                Staff
                            </h3>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                    error={fieldErrors.designation}
                                    label="Designation"
                                >
                                    <input
                                        className={inputClassName(
                                            Boolean(fieldErrors.designation)
                                        )}
                                        maxLength={STAFF_DESIGNATION_MAX_LENGTH}
                                        onChange={(event) => {
                                            setValues((current) => ({
                                                ...current,
                                                designation: event.target.value,
                                            }));
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
                                        className={inputClassName(
                                            Boolean(fieldErrors.permission)
                                        )}
                                        onChange={(event) => {
                                            setValues((current) => ({
                                                ...current,
                                                permission: event.target.value,
                                            }));
                                        }}
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
                                hint={
                                    emailChanged
                                        ? 'Changing your email will require verification'
                                        : 'Required to save changes'
                                }
                                label="Password"
                                metaPlacement="inline"
                                required
                            >
                                <PasswordInput
                                    autoComplete="current-password"
                                    hasError={Boolean(
                                        fieldErrors.currentPassword
                                    )}
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
                                        setValues((current) => ({
                                            ...current,
                                            currentPassword:
                                                sanitizePasswordInput(
                                                    event.target.value
                                                ),
                                        }));
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
    }: {
        hasChanges: boolean;
        isCustomer: boolean;
    }
) {
    const fieldErrors: FieldErrors = {};

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

    if (hasChanges) {
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
        'state',
        'suburb',
    ];

    return (
        values.phoneCountry !== initialValues.phoneCountry ||
        normalizedCurrentPhone !== normalizedInitialPhone ||
        keys.some((key) => values[key] !== initialValues[key])
    );
}
