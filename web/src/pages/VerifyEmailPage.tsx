import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { authApi } from '../auth/api';
import { EMAIL_MAX_LENGTH, PASSWORD_MAX_LENGTH } from '../auth/limits';
import {
    sanitizeEmail,
    sanitizePasswordInput,
    validateEmail,
} from '../auth/validation';
import { Button } from '../components/form/Button';
import { Field } from '../components/form/Field';
import { FormNotice } from '../components/form/FormNotice';
import { inputClassName } from '../components/form/Input';
import { PasswordInput } from '../components/form/PasswordInput';
import { useEnterSubmit } from '../components/form/useEnterSubmit';
import { useToast } from '../components/toast/ToastProvider';
import { downloadHtml } from '../services/download';
import {
    BackendError,
    backendErrorMessage,
    resolveBackendError,
} from '../services/http';

type VerificationScreen = 'error' | 'pending' | 'verifying';

export default function VerifyEmailPage() {
    const formRef = useRef<HTMLFormElement | null>(null);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { showToast } = useToast();
    const [screen, setScreen] = useState<VerificationScreen>('pending');
    const [message, setMessage] = useState(
        'Check your email to verify your account'
    );
    const [email, setEmail] = useState(searchParams.get('email')?.trim() ?? '');
    const [changeEmail, setChangeEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isResending, setIsResending] = useState(false);
    const [isChangingEmail, setIsChangingEmail] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const token = searchParams.get('token')?.trim() ?? '';
    const userType = searchParams.get('userType')?.trim() ?? '';
    const context = searchParams.get('context')?.trim() ?? 'signup';
    const hasToken = token.length > 0;
    const hasChangedEmail =
        Boolean(changeEmail) && changeEmail.trim() !== email.trim();
    const enterSubmit = useEnterSubmit({
        canSubmit: () =>
            Boolean(
                email &&
                hasChangedEmail &&
                password &&
                !validateEmail(changeEmail)
            ),
        enabled: !hasToken,
        formRef,
    });

    useEffect(() => {
        if (searchParams.get('downloaded') !== '1') {
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
    }, [navigate, searchParams, showToast]);

    useEffect(() => {
        if (!hasToken) {
            if (!email) {
                setScreen('error');
                setMessage('Verification details are missing');
            } else {
                setScreen('pending');
                setMessage(
                    context === 'account'
                        ? 'Verify your new email address to finish updating your account'
                        : 'Verify your email address to finish creating your account'
                );
            }
            return;
        }

        setScreen('verifying');
        setMessage('Verifying your email');

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

                if (
                    error instanceof BackendError &&
                    error.code === 'INVALID_EMAIL_VERIFICATION_TOKEN'
                ) {
                    setMessage('Verification link is invalid or expired');
                } else {
                    setMessage('Unable to verify your email');
                }
                setScreen('error');
            });

        return () => {
            isActive = false;
        };
    }, [context, email, hasToken, token, userType]);

    async function handleResend() {
        if (!email || isResending) {
            return;
        }

        setFormError(null);
        setIsResending(true);
        try {
            const result = await authApi.resendVerification({
                email,
                userType: userType === 'staff' ? 'staff' : undefined,
            });
            if (downloadHtml(result.download)) {
                showToast('Verification email downloaded');
            } else {
                showToast('Verification email sent');
            }
        } catch (error) {
            setFormError(toVerificationError(error));
        } finally {
            setIsResending(false);
        }
    }

    async function handleChangeEmail(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const nextEmailError = validateEmail(changeEmail);
        if (!email) {
            setFormError('Verification details are missing');
            return;
        }
        if (nextEmailError) {
            setFormError(nextEmailError);
            return;
        }
        if (!password) {
            setFormError('Password is required');
            return;
        }

        setFormError(null);
        setIsChangingEmail(true);
        try {
            const result = await authApi.changePendingEmail({
                currentEmail: email,
                email: changeEmail.trim(),
                password,
                userType: userType === 'staff' ? 'staff' : undefined,
            });
            if (downloadHtml(result.download)) {
                showToast('Verification email downloaded');
            } else {
                showToast('Verification email sent');
            }
            setEmail(result.verification.email);
            setChangeEmail('');
            setPassword('');
            setShowPassword(false);
        } catch (error) {
            setFormError(toVerificationError(error));
        } finally {
            setIsChangingEmail(false);
        }
    }

    return (
        <section className="mx-auto grid max-w-xl gap-6">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Verify email
            </h1>

            <section className="grid gap-5 rounded border border-slate-200 bg-white p-5">
                <p
                    className={
                        screen === 'error'
                            ? 'text-sm text-red-700'
                            : 'text-sm text-slate-600'
                    }
                >
                    {message}
                </p>
                {email ? (
                    <div className="grid gap-3 border-b border-slate-200 pb-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                        <div className="grid gap-1">
                            <span className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
                                Email
                            </span>
                            <strong className="text-base font-medium break-all text-slate-900">
                                {email}
                            </strong>
                        </div>
                        {!hasToken && screen !== 'error' ? (
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
                    </div>
                ) : null}
                {formError ? (
                    <FormNotice tone="error">{formError}</FormNotice>
                ) : null}

                {!hasToken && screen !== 'error' ? (
                    <>
                        <form
                            className="grid gap-4 pt-1"
                            onKeyDown={enterSubmit.onKeyDown}
                            onSubmit={handleChangeEmail}
                            ref={formRef}
                        >
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
                                    className={inputClassName(
                                        Boolean(formError)
                                    )}
                                    maxLength={EMAIL_MAX_LENGTH}
                                    onChange={(event) => {
                                        setChangeEmail(
                                            sanitizeEmail(event.target.value)
                                        );
                                        setFormError(null);
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
                                            hasError={Boolean(formError)}
                                            maxLength={PASSWORD_MAX_LENGTH}
                                            onChange={(event) => {
                                                setPassword(
                                                    sanitizePasswordInput(
                                                        event.target.value
                                                    )
                                                );
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
                                ) : (
                                    <div />
                                )}
                                <div className="flex justify-end sm:self-end">
                                    <Button
                                        disabled={
                                            isChangingEmail || !hasChangedEmail
                                        }
                                        loading={isChangingEmail}
                                        type="submit"
                                        variant="primary"
                                    >
                                        Change email
                                    </Button>
                                </div>
                            </section>
                        </form>
                    </>
                ) : null}
            </section>
        </section>
    );
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
