import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';

import { authApi, type User } from '../auth/api';
import { PasswordRuleList } from '../auth/PasswordRuleList';
import {
    sanitizeFirstName,
    sanitizeLastName,
    sanitizePasswordInput,
    validateFirstName,
    validateLastName,
    EMAIL_MAX_LENGTH,
    NAME_MAX_LENGTH,
    PASSWORD_MAX_LENGTH,
    getPasswordRules,
    PASSWORD_VALIDATOR,
} from '../auth/validation';
import { Button } from '../components/form/Button';
import { Field } from '../components/form/Field';
import { FormNotice } from '../components/form/FormNotice';
import { inputClassName } from '../components/form/Input';
import { PasswordInput } from '../components/form/PasswordInput';
import { useEnterSubmit } from '../components/form/useEnterSubmit';
import { toErrorMessage } from '../services/http';

interface StaffRegistrationValues {
    confirmPassword: string;
    firstName: string;
    lastName: string;
    password: string;
}

const DEFAULT_VALUES: StaffRegistrationValues = {
    confirmPassword: '',
    firstName: '',
    lastName: '',
    password: '',
};

export default function StaffRegistrationPage() {
    const formRef = useRef<HTMLFormElement | null>(null);
    const [searchParams] = useSearchParams();
    const [invitation, setInvitation] = useState<User | null>(null);
    const [isLoadingInvitation, setIsLoadingInvitation] = useState(true);
    const [invitationError, setInvitationError] = useState<string | null>(null);
    const [values, setValues] = useState(DEFAULT_VALUES);
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
    const enterSubmit = useEnterSubmit({
        canSubmit: () =>
            Boolean(
                invitation &&
                values.firstName &&
                values.lastName &&
                values.password &&
                values.confirmPassword &&
                !formError
            ),
        formRef,
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

        if (!invitation) {
            setFormError('Staff invitation details are missing');
            return;
        }

        const firstNameError = validateFirstName(values.firstName);
        if (firstNameError) {
            setFormError(firstNameError);
            return;
        }
        const lastNameError = validateLastName(values.lastName);
        if (lastNameError) {
            setFormError(lastNameError);
            return;
        }
        const passwordError = PASSWORD_VALIDATOR.tryValidate(values.password, {
            email: invitation.email,
            firstName: values.firstName,
            lastName: values.lastName,
        }).error?.message;
        if (passwordError) {
            setFormError(passwordError);
            return;
        }
        if (passwordRules.some((rule) => !rule.met)) {
            setFormError('Password requirements are not met');
            return;
        }
        if (!values.confirmPassword) {
            setFormError('Confirm password is required');
            return;
        }
        if (values.confirmPassword !== values.password) {
            setFormError('Passwords do not match');
            return;
        }

        setFormError(null);
        setIsSubmitting(true);
        try {
            await authApi.completeStaffInvitation({
                firstName: values.firstName.trim(),
                lastName: values.lastName.trim(),
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

                        <form
                            className="grid gap-4"
                            onKeyDown={enterSubmit.onKeyDown}
                            onSubmit={handleSubmit}
                            ref={formRef}
                        >
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label="First name" required>
                                    <input
                                        className={inputClassName(
                                            Boolean(formError)
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

                                <Field label="Last name" required>
                                    <input
                                        className={inputClassName(
                                            Boolean(formError)
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

                            <Field label="Password" required>
                                <PasswordInput
                                    autoComplete="new-password"
                                    hasError={Boolean(formError)}
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

                            <Field label="Confirm password" required>
                                <PasswordInput
                                    autoComplete="new-password"
                                    hasError={Boolean(formError)}
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
