import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';

import { authApi, type User } from '../auth/api';
import { PasswordRuleList } from '../auth/PasswordRuleList';
import {
    assessFirstName,
    assessLastName,
    assessPassword,
    sanitizeFirstName,
    sanitizeLastName,
    sanitizePasswordInput,
    EMAIL_MAX_LENGTH,
    NAME_MAX_LENGTH,
    PASSWORD_MAX_LENGTH,
    getPasswordRules,
} from '../auth/validation';
import { Button } from '../components/form/Button';
import { Field } from '../components/form/Field';
import { FormNotice } from '../components/form/FormNotice';
import { inputClassName } from '../components/form/Input';
import { PasswordInput } from '../components/form/PasswordInput';
import { normalizeMessage, toErrorMessage } from '../services/http';
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
    const [invitation, setInvitation] = useState<User | null>(null);
    const [isLoadingInvitation, setIsLoadingInvitation] = useState(true);
    const [invitationError, setInvitationError] = useState<string | null>(null);
    const [values, setValues] = useState(DEFAULT_VALUES);
    const [fieldErrors, setFieldErrors] = useState<
        FieldErrors<StaffRegistrationFieldName>
    >({});
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const token = searchParams.get('token')?.trim() ?? '';
    const passwordRules = getPasswordRules(values.password, {
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

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFormError(null);

        if (!invitation) {
            setFormError('Staff invitation details are missing');
            return;
        }

        const nextFieldErrors = collectFieldErrors<StaffRegistrationFieldName>({
            confirmPassword: getConfirmPasswordError(
                values.confirmPassword,
                values.password
            ),
            firstName: assessFirstName(values.firstName),
            lastName: assessLastName(values.lastName),
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

        const firstName = assessFirstName(values.firstName);
        const lastName = assessLastName(values.lastName);

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
            setFormError(
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

            <section className="grid gap-5 rounded border border-slate-200 bg-white p-5">
                {isLoadingInvitation ? (
                    <p className="text-sm text-slate-600">
                        Loading your staff invitation
                    </p>
                ) : invitationError ? (
                    <FormNotice tone="error">{invitationError}</FormNotice>
                ) : invitation ? (
                    <>
                        <div className="grid gap-3 border-b border-slate-200 pb-4">
                            <div className="grid gap-1">
                                <span className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
                                    Staff email
                                </span>
                                <strong className="text-base font-medium break-all text-slate-900">
                                    {invitation.email}
                                </strong>
                            </div>
                            <div className="grid gap-1 sm:grid-cols-3 sm:gap-4">
                                <div className="grid gap-1">
                                    <span className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
                                        Staff ID
                                    </span>
                                    <span className="text-slate-900">
                                        {invitation.staffId ?? 'Not assigned'}
                                    </span>
                                </div>
                                <div className="grid gap-1">
                                    <span className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
                                        Position
                                    </span>
                                    <span className="text-slate-900">
                                        {invitation.designation ??
                                            'Not assigned'}
                                    </span>
                                </div>
                                <div className="grid gap-1">
                                    <span className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
                                        Permission
                                    </span>
                                    <span className="text-slate-900 capitalize">
                                        {invitation.permission ?? 'Admin'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {formError ? (
                            <FormNotice tone="error">{formError}</FormNotice>
                        ) : null}

                        <form className="grid gap-4" onSubmit={handleSubmit}>
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
                                        onChange={(event) => {
                                            setValues((current) => ({
                                                ...current,
                                                firstName: sanitizeFirstName(
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
                                    <input
                                        className={inputClassName(
                                            Boolean(fieldErrors.lastName)
                                        )}
                                        maxLength={NAME_MAX_LENGTH}
                                        onChange={(event) => {
                                            setValues((current) => ({
                                                ...current,
                                                lastName: sanitizeLastName(
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
                                <input
                                    className={inputClassName(false)}
                                    disabled
                                    maxLength={EMAIL_MAX_LENGTH}
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
                                    maxLength={PASSWORD_MAX_LENGTH}
                                    onChange={(event) => {
                                        setValues((current) => ({
                                            ...current,
                                            password: sanitizePasswordInput(
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
                                    maxLength={PASSWORD_MAX_LENGTH}
                                    onChange={(event) => {
                                        setValues((current) => ({
                                            ...current,
                                            confirmPassword:
                                                sanitizePasswordInput(
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

    const assessment = assessPassword(password, {
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
