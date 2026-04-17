import { useEffect, useState, type SubmitEvent } from 'react';
import clsx from 'clsx';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { authApi } from '../auth/api';
import { normalizeNextPath, resolvePostAuthPath } from '../auth/redirects';
import { Button } from '../components/form/Button';
import { Field } from '../components/form/Field';
import { FormNotice } from '../components/form/FormNotice';
import { Input } from '../components/form/Input';
import { PasswordInput } from '../components/form/PasswordInput';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/toast/ToastProvider';
import { downloadHtmlAndNotify } from '../services/download';
import {
    BackendError,
    backendErrorMessage,
    resolveBackendError,
} from '../services/http';
import { Email } from '../types/Email';
import { Password } from '../types/Password';
import {
    collectFieldErrors,
    hasFieldErrors,
    type FieldErrors,
} from '../validation/forms';

type VerificationScreen = 'error' | 'pending' | 'verifying';
type VerificationFieldName = 'email' | 'password';

export default function VerifyEmailPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { showToast } = useToast();
    const token = searchParams.get('token')?.trim() ?? '';
    const queryEmail = searchParams.get('email')?.trim() ?? '';
    const userType =
        searchParams.get('userType')?.trim() === 'staff' ? 'staff' : undefined;
    const context =
        searchParams.get('context')?.trim() === 'account'
            ? 'account'
            : 'signup';
    const wasDownloaded = searchParams.get('downloaded') === '1';
    const nextPath = normalizeNextPath(
        searchParams.get('next'),
        context === 'account'
            ? '/account'
            : userType === 'staff'
              ? '/admin'
              : '/'
    );

    const [email, setEmail] = useState(queryEmail);
    const [changeEmail, setChangeEmail] = useState('');
    const [password, setPassword] = useState('');
    const [screen, setScreen] = useState<VerificationScreen>('pending');
    const [message, setMessage] = useState(
        getPendingMessage(queryEmail, context)
    );
    const [pendingAction, setPendingAction] = useState<
        'change' | 'resend' | null
    >(null);
    const [fieldErrors, setFieldErrors] = useState<
        FieldErrors<VerificationFieldName>
    >({});
    const [formError, setFormError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const hasToken = Boolean(token);
    const nextEmail = changeEmail.trim();
    const hasChangedEmail = Boolean(nextEmail) && nextEmail !== email.trim();
    const showPendingActions = !hasToken && screen !== 'error';
    const isChangingEmail = pendingAction === 'change';
    const isResending = pendingAction === 'resend';

    useEffect(() => {
        if (!wasDownloaded) return;

        showToast('Verification email downloaded');

        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('downloaded');
        navigate(
            {
                search: nextParams.toString()
                    ? `?${nextParams.toString()}`
                    : '',
            },
            { replace: true }
        );
    }, [navigate, searchParams, showToast, wasDownloaded]);

    useEffect(() => {
        setEmail(queryEmail);
        setChangeEmail('');
        setPassword('');
        setFieldErrors({});
        setFormError(null);
        setPendingAction(null);
        setShowPassword(false);

        if (hasToken) {
            return;
        }

        setScreen(queryEmail ? 'pending' : 'error');
        setMessage(getPendingMessage(queryEmail, context));
    }, [context, hasToken, queryEmail]);

    useEffect(() => {
        if (!hasToken) return;

        setScreen('verifying');
        setMessage('Verifying your email');

        let isActive = true;

        void authApi
            .verifyEmail(token)
            .then((user) => {
                if (!isActive) return;

                window.location.assign(resolvePostAuthPath(user, nextPath));
            })
            .catch((error: unknown) => {
                if (!isActive) return;

                setScreen('error');
                setMessage(getVerificationErrorMessage(error));
            });

        return () => {
            isActive = false;
        };
    }, [hasToken, nextPath, token]);

    function handleChangeEmailInput(nextValue: string) {
        setChangeEmail(nextValue);
        setFieldErrors((current) => ({
            ...current,
            email: undefined,
        }));
        setFormError(null);
    }

    async function handleResend() {
        if (!email || isResending) return;

        setFieldErrors({});
        setFormError(null);
        setPendingAction('resend');

        try {
            const result = await authApi.resendVerification({
                email,
                userType,
            });
            downloadHtmlAndNotify(result.download, showToast, {
                downloadedMessage: 'Verification email downloaded',
                sentMessage: 'Verification email sent',
            });
        } catch (error) {
            const nextState = toVerificationErrorState(error);
            setFieldErrors(nextState.fieldErrors);
            setFormError(nextState.formError);
        } finally {
            setPendingAction(null);
        }
    }

    async function handleChangeEmail(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setFormError(null);

        if (!email) {
            setFormError('Verification details are missing');
            return;
        }

        const nextFieldErrors = validatePendingEmailForm({
            currentEmail: email,
            nextEmail,
            password,
        });

        setFieldErrors(nextFieldErrors);
        if (hasFieldErrors(nextFieldErrors)) {
            return;
        }

        const normalizedEmail = Email.assess(nextEmail).value;
        if (!normalizedEmail) {
            return;
        }

        setPendingAction('change');

        try {
            const result = await authApi.changePendingEmail({
                currentEmail: email,
                email: normalizedEmail,
                password,
                userType,
            });
            downloadHtmlAndNotify(result.download, showToast, {
                downloadedMessage: 'Verification email downloaded',
                sentMessage: 'Verification email sent',
            });
            setEmail(result.verification.email);
            setChangeEmail('');
            setPassword('');
            setFieldErrors({});
            setShowPassword(false);
            setScreen('pending');
            setMessage(getPendingMessage(result.verification.email, context));
        } catch (error) {
            const nextState = toVerificationErrorState(error);
            setFieldErrors(nextState.fieldErrors);
            setFormError(nextState.formError);
        } finally {
            setPendingAction(null);
        }
    }

    return (
        <section className="mx-auto grid max-w-xl gap-6">
            <PageHeader title="Verify email" />

            <section className="grid gap-5 rounded border border-slate-200 bg-white p-5">
                {screen !== 'pending' ? (
                    <p
                        className={clsx(
                            'text-sm',
                            screen === 'error'
                                ? 'text-red-700'
                                : 'text-slate-600'
                        )}
                    >
                        {message}
                    </p>
                ) : null}

                {email ? (
                    <section className="grid gap-3 border-b border-slate-200 pb-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                        <div className="grid gap-1">
                            <span className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
                                Email
                            </span>
                            <strong className="text-base font-medium break-all text-slate-900">
                                {email}
                            </strong>
                        </div>

                        {showPendingActions ? (
                            <div className="flex justify-start sm:justify-end sm:self-end">
                                <Button
                                    disabled={isResending}
                                    loading={isResending}
                                    onClick={() => {
                                        void handleResend();
                                    }}
                                    type="button"
                                    variant="secondary"
                                >
                                    Resend verification
                                </Button>
                            </div>
                        ) : null}
                    </section>
                ) : null}

                {formError ? (
                    <FormNotice tone="error">{formError}</FormNotice>
                ) : null}

                {showPendingActions ? (
                    <form
                        className="grid gap-4 pt-1"
                        onSubmit={handleChangeEmail}
                    >
                        <div className="grid gap-1">
                            <h2 className="text-base font-semibold text-slate-900">
                                Use a different email
                            </h2>
                            <p className="text-sm text-slate-600">
                                Send the verification link somewhere else.
                            </p>
                        </div>

                        <Field
                            error={fieldErrors.email}
                            label="New email"
                            required
                        >
                            <Input
                                autoComplete="email"
                                hasError={Boolean(fieldErrors.email)}
                                maxLength={Email.MAX_LENGTH}
                                name="email"
                                onBlur={() => {
                                    setFieldErrors((current) => ({
                                        ...current,
                                        email:
                                            Email.assess(nextEmail).error ??
                                            undefined,
                                    }));
                                }}
                                onChange={(event) => {
                                    handleChangeEmailInput(
                                        Email.formatInput(event.target.value)
                                    );
                                }}
                                placeholder="jane.doe@email.com"
                                type="email"
                                value={changeEmail}
                            />
                        </Field>

                        {/* Two-column layout only when the password field is visible;
                            otherwise just right-align the button. */}
                        <section
                            className={clsx(
                                hasChangedEmail
                                    ? 'grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end'
                                    : 'flex justify-end'
                            )}
                        >
                            {hasChangedEmail ? (
                                <Field
                                    error={fieldErrors.password}
                                    hint={
                                        fieldErrors.password
                                            ? undefined
                                            : 'Required to change it'
                                    }
                                    label="Password"
                                    metaPlacement="inline"
                                    required
                                >
                                    <PasswordInput
                                        autoComplete="current-password"
                                        hasError={Boolean(fieldErrors.password)}
                                        maxLength={Password.MAX_LENGTH}
                                        name="currentPassword"
                                        onBlur={() => {
                                            setFieldErrors((current) => ({
                                                ...current,
                                                password: password
                                                    ? undefined
                                                    : 'Password is required',
                                            }));
                                        }}
                                        onChange={(event) => {
                                            setPassword(
                                                Password.formatInput(
                                                    event.target.value
                                                )
                                            );
                                            setFieldErrors((current) => ({
                                                ...current,
                                                password: undefined,
                                            }));
                                            setFormError(null);
                                        }}
                                        onToggle={() => {
                                            setShowPassword(
                                                (current) => !current
                                            );
                                        }}
                                        placeholder="Enter your password"
                                        showPassword={showPassword}
                                        value={password}
                                    />
                                </Field>
                            ) : null}

                            <Button
                                disabled={isChangingEmail || !hasChangedEmail}
                                loading={isChangingEmail}
                                type="submit"
                                variant="primary"
                            >
                                Change email
                            </Button>
                        </section>
                    </form>
                ) : null}
            </section>
        </section>
    );
}

function getPendingMessage(email: string, context: 'account' | 'signup') {
    if (!email) return 'Verification details are missing';

    return context === 'account'
        ? 'Verify your new email address to finish updating your account'
        : 'Verify your email address to finish creating your account';
}

function getVerificationErrorMessage(error: unknown) {
    return error instanceof BackendError &&
        error.code === 'INVALID_EMAIL_VERIFICATION_TOKEN'
        ? 'Verification link is invalid or expired'
        : 'Unable to verify your email';
}

function validatePendingEmailForm({
    currentEmail,
    nextEmail,
    password,
}: {
    currentEmail: string;
    nextEmail: string;
    password: string;
}) {
    if (!currentEmail) {
        return {};
    }

    return collectFieldErrors<VerificationFieldName>({
        email: Email.assess(nextEmail),
        password: password ? null : 'Password is required',
    });
}

function toVerificationErrorState(error: unknown) {
    return resolveBackendError<{
        fieldErrors: FieldErrors<VerificationFieldName>;
        formError: string | null;
    }>(
        error,
        {
            EMAIL_EXISTS: (backendError) => ({
                fieldErrors: { email: backendErrorMessage(backendError.code) },
                formError: null,
            }),
            EMAIL_VERIFICATION_PENDING: (backendError) => ({
                fieldErrors: { email: backendErrorMessage(backendError.code) },
                formError: null,
            }),
            INVALID_CREDENTIALS: (backendError) => ({
                fieldErrors: {
                    password: backendErrorMessage(backendError.code),
                },
                formError: null,
            }),
            STAFF_ACCOUNT_REQUIRED: (backendError) => ({
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
