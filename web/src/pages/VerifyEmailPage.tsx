import { useEffect, useState, type SubmitEvent } from 'react';
import clsx from 'clsx';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { authApi } from '../auth/api';
import {
    AuthPageLayout,
    authMetaLabelClassName,
    authPanelClassName,
} from '../auth/AuthPageLayout';
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
import { useToast } from '../components/toast/ToastProvider';
import { downloadHtmlAndNotify } from '../services/download';
import {
    BackendError,
    backendErrorMessage,
    resolveBackendError,
} from '../services/http';

type VerificationScreen = 'error' | 'pending' | 'verifying';
type PendingAction = 'change-email' | 'resend' | null;
type VerificationContext = 'account' | 'signup';
type VerificationStatus = {
    message: string;
    screen: VerificationScreen;
};

type VerificationFormValues = {
    email: string;
    password: string;
};

const VERIFICATION_CONTEXT_MESSAGE: Record<VerificationContext, string> = {
    account: 'Verify your new email address to finish updating your account',
    signup: 'Verify your email address to finish creating your account',
};

export default function VerifyEmailPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { showToast } = useToast();
    const context = resolveVerificationContext(searchParams.get('context'));
    const token = searchParams.get('token')?.trim() ?? '';
    const queryEmail = searchParams.get('email')?.trim() ?? '';
    const userType = searchParams.get('userType')?.trim() === 'staff'
        ? 'staff'
        : undefined;
    const wasDownloaded = searchParams.get('downloaded') === '1';

    const [email, setEmail] = useState(queryEmail);
    const [formValues, setFormValues] = useState<VerificationFormValues>({
        email: '',
        password: '',
    });
    const [status, setStatus] = useState<VerificationStatus>(() =>
        getPendingVerificationStatus(queryEmail, context)
    );
    const [pendingAction, setPendingAction] = useState<PendingAction>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const nextEmail = formValues.email.trim();
    const isErrorScreen = status.screen === 'error';
    const showPendingActions = !token && !isErrorScreen;
    const showStatusMessage = status.screen !== 'pending';
    const hasChangedEmail = Boolean(nextEmail) && nextEmail !== email.trim();
    const isChangingEmail = pendingAction === 'change-email';
    const isResending = pendingAction === 'resend';

    useEffect(() => {
        if (!wasDownloaded) {
            return;
        }

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
        setFormError(null);
        setFormValues({
            email: '',
            password: '',
        });
        setPendingAction(null);
        setShowPassword(false);

        if (!token) {
            setStatus(getPendingVerificationStatus(queryEmail, context));
            return;
        }

        setStatus({
            message: 'Verifying your email',
            screen: 'verifying',
        });

        let isActive = true;
        void authApi
            .verifyEmail(token)
            .then(() => {
                window.location.assign(userType === 'staff' ? '/admin' : '/');
            })
            .catch((error: unknown) => {
                if (!isActive) {
                    return;
                }

                setStatus(getFailedVerificationStatus(error));
            });

        return () => {
            isActive = false;
        };
    }, [context, queryEmail, token, userType]);

    function updateFormValue(
        name: keyof VerificationFormValues,
        value: string
    ) {
        setFormValues((current) => ({
            ...current,
            [name]: value,
        }));
        setFormError(null);
    }

    function handleResend() {
        if (!email || isResending) {
            return;
        }

        setFormError(null);
        setPendingAction('resend');

        void authApi
            .resendVerification({
                email,
                userType,
            })
            .then((result) => {
                downloadHtmlAndNotify(result.download, showToast, {
                    downloadedMessage: 'Verification email downloaded',
                    sentMessage: 'Verification email sent',
                });
            })
            .catch((error) => {
                setFormError(toVerificationError(error));
            })
            .finally(() => {
                setPendingAction(null);
            });
    }

    async function handleChangeEmail(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();

        const validationError = validatePendingEmailForm({
            currentEmail: email,
            nextEmail,
            password: formValues.password,
        });
        if (validationError) {
            setFormError(validationError);
            return;
        }

        setFormError(null);
        setPendingAction('change-email');

        try {
            const result = await authApi.changePendingEmail({
                currentEmail: email,
                email: nextEmail,
                password: formValues.password,
                userType,
            });
            downloadHtmlAndNotify(result.download, showToast, {
                downloadedMessage: 'Verification email downloaded',
                sentMessage: 'Verification email sent',
            });
            setEmail(result.verification.email);
            setFormValues({
                email: '',
                password: '',
            });
            setShowPassword(false);
            setStatus(getPendingVerificationStatus(result.verification.email, context));
        } catch (error) {
            setFormError(toVerificationError(error));
        } finally {
            setPendingAction(null);
        }
    }

    return (
        <AuthPageLayout title="Verify email">
            <section className={clsx(authPanelClassName, 'gap-5')}>
                {showStatusMessage ? (
                    <p
                        className={clsx(
                            'text-sm',
                            isErrorScreen ? 'text-red-700' : 'text-slate-600'
                        )}
                    >
                        {status.message}
                    </p>
                ) : null}

                {email ? (
                    <section className="grid gap-3 border-b border-slate-200 pb-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                        <div className="grid gap-1">
                            <span className={authMetaLabelClassName}>Email</span>
                            <strong className="text-base font-medium break-all text-slate-900">
                                {email}
                            </strong>
                        </div>
                        {showPendingActions ? (
                            <div className="flex justify-start sm:justify-end sm:self-end">
                                <Button
                                    disabled={isResending}
                                    loading={isResending}
                                    onClick={handleResend}
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
                                    updateFormValue(
                                        'email',
                                        sanitizeEmail(event.target.value)
                                    );
                                }}
                                placeholder="jane.doe@email.com"
                                type="email"
                                value={formValues.email}
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
                                            updateFormValue(
                                                'password',
                                                sanitizePasswordInput(
                                                    event.target.value
                                                )
                                            );
                                        }}
                                        onToggle={() => {
                                            setShowPassword((current) => !current);
                                        }}
                                        placeholder="Enter your password"
                                        showPassword={showPassword}
                                        value={formValues.password}
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
        </AuthPageLayout>
    );
}

function getPendingVerificationStatus(
    email: string,
    context: VerificationContext
): VerificationStatus {
    if (!email) {
        return {
            message: 'Verification details are missing',
            screen: 'error',
        };
    }

    return {
        message: VERIFICATION_CONTEXT_MESSAGE[context],
        screen: 'pending',
    };
}

function getFailedVerificationStatus(error: unknown): VerificationStatus {
    return {
        message:
            error instanceof BackendError &&
            error.code === 'INVALID_EMAIL_VERIFICATION_TOKEN'
                ? 'Verification link is invalid or expired'
                : 'Unable to verify your email',
        screen: 'error',
    };
}

function resolveVerificationContext(
    value: string | null
): VerificationContext {
    return value === 'account' ? 'account' : 'signup';
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
        return 'Verification details are missing';
    }

    const emailError = validateEmail(nextEmail);
    if (emailError) {
        return emailError;
    }

    if (!password) {
        return 'Password is required';
    }

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
