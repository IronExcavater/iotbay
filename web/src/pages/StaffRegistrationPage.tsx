import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';

import { authApi, type User } from '../auth/api';
import { PasswordRuleList } from '../auth/PasswordRuleList';
import { Button } from '../components/form/Button';
import { Field } from '../components/form/Field';
import { FormNotice } from '../components/form/FormNotice';
import { Input } from '../components/form/Input';
import { PasswordInput } from '../components/form/PasswordInput';
import { useToast } from '../components/toast/ToastProvider';
import { normalizeMessage, toErrorMessage } from '../services/http';
import { Email } from '../types/Email';
import { FirstName, LastName } from '../types/Name';
import { Password } from '../types/Password';
import {
    collectFieldErrors,
    hasFieldErrors,
    type FieldErrors,
} from '../validation/forms';

interface StaffRegistrationValues {
    confirmPassword: string;
    firstName: string;
    lastName: string;
    password: string;
}

type StaffRegistrationFieldName = keyof StaffRegistrationValues | 'email';

const DEFAULT_VALUES: StaffRegistrationValues = {
    confirmPassword: '',
    firstName: '',
    lastName: '',
    password: '',
};

export default function StaffRegistrationPage() {
    const [searchParams] = useSearchParams();
    const { showToast } = useToast();
    const [invitation, setInvitation] = useState<User | null>(null);
    const [isLoadingInvitation, setIsLoadingInvitation] = useState(true);
    const [invitationError, setInvitationError] = useState<string | null>(null);
    const [values, setValues] = useState(DEFAULT_VALUES);
    const [fieldErrors, setFieldErrors] = useState<
        FieldErrors<StaffRegistrationFieldName>
    >({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const token = searchParams.get('token')?.trim() ?? '';
    const passwordRules = Password.rules(values.password, {
        email: invitation?.email ?? '',
        firstName: values.firstName,
        lastName: values.lastName,
    });

    useEffect(() => {
        if (!token) {
            setInvitationError('Staff invitation link is missing');
            setIsLoadingInvitation(false);
            return;
        }

        const abortController = new AbortController();
        void authApi
            .staffInvitation(token, abortController.signal)
            .then((user) => {
                setInvitation(user);
                setInvitationError(null);
            })
            .catch((error: unknown) => {
                if (!abortController.signal.aborted) {
                    setInvitationError(
                        toErrorMessage(error, 'Unable to load invitation')
                    );
                }
            })
            .finally(() => {
                if (!abortController.signal.aborted) {
                    setIsLoadingInvitation(false);
                }
            });

        return () => abortController.abort();
    }, [token]);

    function setFieldError(
        name: StaffRegistrationFieldName,
        value?: string | null
    ) {
        setFieldErrors((current) => ({
            ...current,
            [name]: value || undefined,
        }));
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!invitation) {
            showToast('Staff invitation details are missing');
            return;
        }

        // Assess once, derive both validation errors and the payload values.
        const firstName = FirstName.assess(values.firstName);
        const lastName = LastName.assess(values.lastName);

        const nextFieldErrors = collectFieldErrors<StaffRegistrationFieldName>({
            confirmPassword: getConfirmPasswordError(
                values.confirmPassword,
                values.password
            ),
            firstName,
            lastName,
            password: getPasswordError({
                email: invitation.email,
                firstName: values.firstName,
                lastName: values.lastName,
                password: values.password,
                passwordRulesMet: passwordRules.every((rule) => rule.met),
            }),
        });

        setFieldErrors(nextFieldErrors);
        if (hasFieldErrors(nextFieldErrors)) {
            return;
        }

        // Type-narrowing guard: if there are no field errors the values must be present.
        if (!firstName.value || !lastName.value) {
            return;
        }

        setIsSubmitting(true);
        try {
            await authApi.completeStaffInvitation({
                firstName: firstName.value,
                lastName: lastName.value,
                password: values.password,
                token,
            });
            window.location.assign('/admin');
        } catch (error) {
            showToast(
                toErrorMessage(error, 'Unable to complete staff registration')
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className="mx-auto grid max-w-xl gap-6">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Create your staff account
            </h1>

            <section className="bg-ui-0 border-ui-200 grid gap-5 rounded border p-5">
                {isLoadingInvitation ? (
                    <p className="text-ui-600 text-sm">
                        Loading your staff invitation
                    </p>
                ) : invitationError ? (
                    <FormNotice tone="error">{invitationError}</FormNotice>
                ) : invitation ? (
                    <>
                        <div className="border-ui-200 grid gap-3 border-b pb-4">
                            <div className="grid gap-1">
                                <span className="text-ui-500 text-xs font-semibold tracking-[0.18em] uppercase">
                                    Staff email
                                </span>
                                <strong className="text-ui-900 text-base font-medium break-all">
                                    {invitation.email}
                                </strong>
                            </div>
                            <div className="grid gap-1 sm:grid-cols-3 sm:gap-4">
                                <div className="grid gap-1">
                                    <span className="text-ui-500 text-xs font-semibold tracking-[0.18em] uppercase">
                                        Staff ID
                                    </span>
                                    <span className="text-ui-900">
                                        {invitation.staffId ?? 'Not assigned'}
                                    </span>
                                </div>
                                <div className="grid gap-1">
                                    <span className="text-ui-500 text-xs font-semibold tracking-[0.18em] uppercase">
                                        Position
                                    </span>
                                    <span className="text-ui-900">
                                        {invitation.designation ??
                                            'Not assigned'}
                                    </span>
                                </div>
                                <div className="grid gap-1">
                                    <span className="text-ui-500 text-xs font-semibold tracking-[0.18em] uppercase">
                                        Permission
                                    </span>
                                    <span className="text-ui-900 capitalize">
                                        {invitation.permission ?? 'Admin'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <form className="grid gap-4" onSubmit={handleSubmit}>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                    error={fieldErrors.firstName}
                                    label="First name"
                                    required
                                >
                                    <Input
                                        hasError={Boolean(
                                            fieldErrors.firstName
                                        )}
                                        maxLength={FirstName.MAX_LENGTH}
                                        onBlur={() => {
                                            setFieldError(
                                                'firstName',
                                                FirstName.validate(
                                                    values.firstName
                                                )
                                            );
                                        }}
                                        onChange={(event) => {
                                            setValues((current) => ({
                                                ...current,
                                                firstName:
                                                    FirstName.formatInput(
                                                        event.target.value
                                                    ),
                                            }));
                                        }}
                                        placeholder="Taylor"
                                        value={values.firstName}
                                    />
                                </Field>

                                <Field
                                    error={fieldErrors.lastName}
                                    label="Last name"
                                    required
                                >
                                    <Input
                                        hasError={Boolean(fieldErrors.lastName)}
                                        maxLength={LastName.MAX_LENGTH}
                                        onBlur={() => {
                                            setFieldError(
                                                'lastName',
                                                LastName.validate(
                                                    values.lastName
                                                )
                                            );
                                        }}
                                        onChange={(event) => {
                                            setValues((current) => ({
                                                ...current,
                                                lastName: LastName.formatInput(
                                                    event.target.value
                                                ),
                                            }));
                                        }}
                                        placeholder="Morgan"
                                        value={values.lastName}
                                    />
                                </Field>
                            </div>

                            <Field label="Email" required>
                                <Input
                                    disabled
                                    maxLength={Email.MAX_LENGTH}
                                    value={invitation.email}
                                />
                            </Field>

                            <Field
                                error={fieldErrors.password}
                                label="Password"
                                required
                            >
                                <PasswordInput
                                    autoComplete="new-password"
                                    hasError={Boolean(fieldErrors.password)}
                                    maxLength={Password.MAX_LENGTH}
                                    onBlur={() => {
                                        setFieldError(
                                            'password',
                                            getPasswordError({
                                                email: invitation.email,
                                                firstName: values.firstName,
                                                lastName: values.lastName,
                                                password: values.password,
                                                passwordRulesMet:
                                                    passwordRules.every(
                                                        (rule) => rule.met
                                                    ),
                                            })
                                        );
                                    }}
                                    onChange={(event) => {
                                        setValues((current) => ({
                                            ...current,
                                            password: Password.formatInput(
                                                event.target.value
                                            ),
                                        }));
                                    }}
                                    onToggle={() => {
                                        setShowPassword((current) => !current);
                                    }}
                                    placeholder="Choose a password"
                                    showPassword={showPassword}
                                    value={values.password}
                                />
                                <PasswordRuleList rules={passwordRules} />
                            </Field>

                            <Field
                                error={fieldErrors.confirmPassword}
                                label="Confirm password"
                                required
                            >
                                <PasswordInput
                                    autoComplete="new-password"
                                    hasError={Boolean(
                                        fieldErrors.confirmPassword
                                    )}
                                    maxLength={Password.MAX_LENGTH}
                                    onBlur={() => {
                                        setFieldError(
                                            'confirmPassword',
                                            getConfirmPasswordError(
                                                values.confirmPassword,
                                                values.password
                                            )
                                        );
                                    }}
                                    onChange={(event) => {
                                        setValues((current) => ({
                                            ...current,
                                            confirmPassword:
                                                Password.formatInput(
                                                    event.target.value
                                                ),
                                        }));
                                    }}
                                    onToggle={() => {
                                        setShowConfirmPassword(
                                            (current) => !current
                                        );
                                    }}
                                    placeholder="Re-enter your password"
                                    showPassword={showConfirmPassword}
                                    value={values.confirmPassword}
                                />
                            </Field>

                            <Button
                                disabled={isSubmitting}
                                loading={isSubmitting}
                                type="submit"
                                variant="primary"
                            >
                                Create staff account
                            </Button>
                        </form>
                    </>
                ) : null}
            </section>
        </section>
    );
}

function getPasswordError({
    email,
    firstName,
    lastName,
    password,
    passwordRulesMet,
}: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    passwordRulesMet: boolean;
}) {
    if (!password) {
        return 'Password is required';
    }

    const assessment = Password.assess(password, {
        email,
        firstName,
        lastName,
    });

    if (assessment.error) {
        return normalizeMessage(assessment.error);
    }

    return passwordRulesMet ? null : 'Password requirements are not met';
}

function getConfirmPasswordError(confirmPassword: string, password: string) {
    if (!confirmPassword) {
        return 'Confirm password is required';
    }

    return confirmPassword !== password ? 'Passwords do not match' : null;
}
