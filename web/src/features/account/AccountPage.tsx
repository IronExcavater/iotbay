import { useEffect, useState, type SubmitEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import {
    AccountActionsSection,
    AccountContactSection,
    AccountPersonalSection,
    AccountStaffSection,
} from '@features/account/components/AccountFormSections';
import {
    DEFAULT_PROFILE_VALUES,
    hasProfileChanges,
    toAccountError,
    toProfileUpdateInput,
    toProfileValues,
    validateProfileForm,
    type ProfileFieldErrors,
} from '@features/account/profileForm';
import type { ProfileValues } from '@features/account/types';
import {
    setAddressField,
    type AddressFieldName,
} from '@features/addresses/form';
import { useAuth } from '@features/auth/AuthProvider';
import { validatePhoneNumber } from '@features/auth/phone';
import { buildVerifyEmailPath } from '@features/auth/redirects';
import { downloadHtml } from '@shared/services/download';
import { useToast } from '@shared/ui/toast/ToastProvider';
import { Email } from '@shared/value-objects/Email';
import { FirstName, LastName } from '@shared/value-objects/Name';
import { Designation, StaffId } from '@shared/value-objects/Staff';

type FieldErrors = ProfileFieldErrors;

export default function AccountPage() {
    const navigate = useNavigate();
    const { updateMe, user } = useAuth();
    const { showToast } = useToast();
    const [values, setValues] = useState<ProfileValues>(DEFAULT_PROFILE_VALUES);
    const [initialValues, setInitialValues] = useState<ProfileValues>(
        DEFAULT_PROFILE_VALUES
    );
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
