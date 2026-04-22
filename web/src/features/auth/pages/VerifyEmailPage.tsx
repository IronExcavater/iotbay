import { useEffect, useState, type SubmitEvent } from 'react';
import clsx from 'clsx';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { authApi } from '@features/auth/api';
import {
    normalizeNextPath,
    resolvePostAuthPath,
} from '@features/auth/redirects';
import { downloadHtmlAndNotify } from '@shared/services/download';
import {
    BackendError,
    backendErrorMessage,
    resolveBackendError,
} from '@shared/services/http';
import { Button } from '@shared/ui/form/Button';
import { Field } from '@shared/ui/form/Field';
import { Input } from '@shared/ui/form/Input';
import { PasswordInput } from '@shared/ui/form/PasswordInput';
import { PageHeader } from '@shared/ui/PageHeader';
import { useToast } from '@shared/ui/toast/ToastProvider';
import {
    collectFieldErrors,
    hasFieldErrors,
    type FieldErrors,
} from '@shared/validation/forms';
import { Email } from '@shared/value-objects/Email';
import { Password } from '@shared/value-objects/Password';

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
    }

    async function handleResend() {
        if (!email || isResending) return;

        setFieldErrors({});
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
            if (nextState.formError) showToast(nextState.formError);
        } finally {
            setPendingAction(null);
        }
    }

    async function handleChangeEmail(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!email) {
            showToast('Verification details are missing');
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
            if (nextState.formError) showToast(nextState.formError);
        } finally {
            setPendingAction(null);
        }
    }

    return (
        <section className="mx-auto grid max-w-xl gap-6">
            <PageHeader title="Verify email" />

            <section className="bg-ui-0 border-ui-200 grid gap-5 rounded border p-5">
                {screen !== 'pending' && (
                    <p
                        className={clsx(
                            'text-sm',
                            screen === 'error' ? 'text-red-700' : 'text-ui-600'
                        )}
                    >
                        {message}
                    </p>
                )}

                {email && (
                    <section className="border-ui-200 grid gap-3 border-b pb-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                        <div className="grid gap-1">
                            <span className="text-ui-500 text-xs font-semibold tracking-[0.18em] uppercase">
                                Email
                            </span>
                            <strong className="text-ui-900 text-base font-medium break-all">
                                {email}
                            </strong>
                        </div>

                        {showPendingActions && (
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
                        )}
                    </section>
                )}

                {showPendingActions && (
                    <form
                        className="grid gap-4 pt-1"
                        onSubmit={handleChangeEmail}
                    >
                        <div className="grid gap-1">
                            <h2 className="text-ui-900 text-base font-semibold">
                                Use a different email
                            </h2>
                            <p className="text-ui-600 text-sm">
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
                            {hasChangedEmail && (
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
                            )}

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
                )}
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
