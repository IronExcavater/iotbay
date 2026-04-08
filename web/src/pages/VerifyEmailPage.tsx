import { useEffect, useState, type SubmitEvent } from 'react';
import clsx from 'clsx';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { authApi } from '../auth/api';
import { normalizeNextPath, resolvePostAuthPath } from '../auth/redirects';
import {
    EMAIL_MAX_LENGTH,
    PASSWORD_MAX_LENGTH,
    sanitizeEmail,
    sanitizePasswordInput,
    validateEmail,
} from '../auth/validation';
import { Button } from '../components/form/Button';
import { Field } from '../components/form/Field';
import { FormNotice } from '../components/form/FormNotice';
import { inputClassName } from '../components/form/Input';
import { PasswordInput } from '../components/form/PasswordInput';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/toast/ToastProvider';
import { downloadHtmlAndNotify } from '../services/download';
import {
    BackendError,
    backendErrorMessage,
    resolveBackendError,
} from '../services/http';

type VerificationScreen = 'error' | 'pending' | 'verifying';

export default function VerifyEmailPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { showToast } = useToast();
    const token = searchParams.get('token')?.trim() ?? '';
    const queryEmail = searchParams.get('email')?.trim() ?? '';
    const userType = searchParams.get('userType')?.trim() === 'staff'
        ? 'staff'
        : undefined;
    const context = searchParams.get('context')?.trim() === 'account'
        ? 'account'
        : 'signup';
    const wasDownloaded = searchParams.get('downloaded') === '1';
    const nextPath = normalizeNextPath(
        searchParams.get('next'),
        context === 'account' ? '/account' : userType === 'staff' ? '/admin' : '/'
    );

    const [email, setEmail] = useState(queryEmail);
    const [changeEmail, setChangeEmail] = useState('');
    const [password, setPassword] = useState('');
    const [screen, setScreen] = useState<VerificationScreen>('pending');
    const [message, setMessage] = useState(getPendingMessage(queryEmail, context));
    const [pendingAction, setPendingAction] = useState<'change' | 'resend' | null>(
        null
    );
    const [formError, setFormError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const hasToken = Boolean(token);
    const nextEmail = changeEmail.trim();
    const hasChangedEmail = Boolean(nextEmail) && nextEmail !== email.trim();
    const showPendingActions = !hasToken && screen !== 'error';
    const isChangingEmail = pendingAction === 'change';
    const isResending = pendingAction === 'resend';

    useEffect(() => {
        if (!wasDownloaded)
            return;

        showToast('Verification email downloaded');

        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('downloaded');
        navigate(
            {
                search: nextParams.toString() ? `?${nextParams.toString()}` : '',
            },
            { replace: true }
        );
    }, [navigate, searchParams, showToast, wasDownloaded]);

    useEffect(() => {
        setEmail(queryEmail);
        setChangeEmail('');
        setPassword('');
        setFormError(null);
        setPendingAction(null);
        setShowPassword(false);

        if (!hasToken) {
            setScreen(queryEmail ? 'pending' : 'error');
            setMessage(getPendingMessage(queryEmail, context));
            return;
        }

        setScreen('verifying');
        setMessage('Verifying your email');

        let isActive = true;

        void authApi
            .verifyEmail(token)
            .then((user) => {
                // The verification link may come from deep inside an auth flow,
                // so finish on the originally requested destination when possible.
                window.location.assign(resolvePostAuthPath(user, nextPath));
            })
            .catch((error: unknown) => {
                if (!isActive)
                    return;

                setScreen('error');
                setMessage(getVerificationErrorMessage(error));
            });

        return () => {
            isActive = false;
        };
    }, [context, hasToken, nextPath, queryEmail, token]);

    function handleChangeEmailInput(nextValue: string) {
        setChangeEmail(nextValue);
        setFormError(null);
    }

    async function handleResend() {
        if (!email || isResending)
            return;

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
            setFormError(toVerificationError(error));
        } finally {
            setPendingAction(null);
        }
    }

    async function handleChangeEmail(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();

        const validationError = validatePendingEmailForm({
            currentEmail: email,
            nextEmail,
            password,
        });

        if (validationError) {
            setFormError(validationError);
            return;
        }

        setFormError(null);
        setPendingAction('change');

        try {
            const result = await authApi.changePendingEmail({
                currentEmail: email,
                email: nextEmail,
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
            setShowPassword(false);
            setScreen('pending');
            setMessage(getPendingMessage(result.verification.email, context));
        } catch (error) {
            setFormError(toVerificationError(error));
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
                            screen === 'error' ? 'text-red-700' : 'text-slate-600'
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
                    <form className="grid gap-4 pt-1" onSubmit={handleChangeEmail}>
                        <div className="grid gap-1">
                            <h2 className="text-base font-semibold text-slate-900">
                                Use a different email
                            </h2>
                            <p className="text-sm text-slate-600">
                                Send the verification link somewhere else.
                            </p>
                        </div>

                        <Field label="New email" required>
                            <input
                                autoComplete="email"
                                className={inputClassName(Boolean(formError))}
                                maxLength={EMAIL_MAX_LENGTH}
                                name="email"
                                onChange={(event) => {
                                    handleChangeEmailInput(
                                        sanitizeEmail(event.target.value)
                                    );
                                }}
                                placeholder="jane.doe@email.com"
                                type="email"
                                value={changeEmail}
                            />
                        </Field>

                        <section className="grid min-h-18 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                            {hasChangedEmail ? (
                                <Field
                                    hint="Required to change it"
                                    label="Password"
                                    metaPlacement="inline"
                                    required
                                >
                                    <PasswordInput
                                        autoComplete="current-password"
                                        hasError={Boolean(formError)}
                                        maxLength={PASSWORD_MAX_LENGTH}
                                        name="currentPassword"
                                        onChange={(event) => {
                                            setPassword(
                                                sanitizePasswordInput(
                                                    event.target.value
                                                )
                                            );
                                            setFormError(null);
                                        }}
                                        onToggle={() => {
                                            setShowPassword((current) => !current);
                                        }}
                                        placeholder="Enter your password"
                                        showPassword={showPassword}
                                        value={password}
                                    />
                                </Field>
                            ) : (
                                <div />
                            )}

                            <div className="flex justify-end sm:self-end">
                                <Button
                                    disabled={isChangingEmail || !hasChangedEmail}
                                    loading={isChangingEmail}
                                    type="submit"
                                    variant="primary"
                                >
                                    Change email
                                </Button>
                            </div>
                        </section>
                    </form>
                ) : null}
            </section>
        </section>
    );
}

function getPendingMessage(
    email: string,
    context: 'account' | 'signup'
) {
    if (!email)
        return 'Verification details are missing';

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
    if (!currentEmail)
        return 'Verification details are missing';

    const emailError = validateEmail(nextEmail);

    if (emailError)
        return emailError;

    if (!password)
        return 'Password is required';

    return null;
}

function toVerificationError(error: unknown) {
    return resolveBackendError<string>(
        error,
        {
            EMAIL_EXISTS: (backendError) =>
                backendErrorMessage(backendError.code),
            EMAIL_VERIFICATION_PENDING: (backendError) =>
                backendErrorMessage(backendError.code),
            INVALID_CREDENTIALS: (backendError) =>
                backendErrorMessage(backendError.code),
            STAFF_ACCOUNT_REQUIRED: (backendError) =>
                backendErrorMessage(backendError.code),
        },
        (message) => message
    );
}
