import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

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
import { downloadFile } from '../services/download';
import { BackendError } from '../services/http';

type VerificationScreen = 'error' | 'pending' | 'verifying';

export default function VerifyEmailPage() {
    const formRef = useRef<HTMLFormElement | null>(null);
    const [searchParams] = useSearchParams();
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
    const [successMessage, setSuccessMessage] = useState<string | null>(
        searchParams.get('downloaded') === '1'
            ? 'The verification email was downloaded because SMTP is unavailable'
            : null
    );
    const [showPassword, setShowPassword] = useState(false);

    const token = searchParams.get('token')?.trim() ?? '';
    const userType = searchParams.get('userType')?.trim() ?? '';
    const context = searchParams.get('context')?.trim() ?? 'signup';
    const hasToken = token.length > 0;
    const signInPath = `/auth?mode=signin${email ? `&email=${encodeURIComponent(email)}` : ''}${userType === 'staff' ? '&userType=staff&next=/admin' : ''}`;
    const enterSubmit = useEnterSubmit({
        canSubmit: () =>
            Boolean(
                email && changeEmail && password && !validateEmail(changeEmail)
            ),
        enabled: !hasToken,
        formRef,
    });

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
        setSuccessMessage(null);
        setIsResending(true);
        try {
            const result = await authApi.resendVerification({
                email,
                userType: userType === 'staff' ? 'staff' : undefined,
            });
            if (result.download) {
                downloadFile(
                    result.download.filename,
                    result.download.html,
                    'text/html;charset=utf-8'
                );
                setSuccessMessage('A new verification email was downloaded');
            } else {
                setSuccessMessage('A new verification email has been sent');
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
        setSuccessMessage(null);
        setIsChangingEmail(true);
        try {
            const result = await authApi.changePendingEmail({
                currentEmail: email,
                email: changeEmail.trim(),
                password,
                userType: userType === 'staff' ? 'staff' : undefined,
            });
            if (result.download) {
                downloadFile(
                    result.download.filename,
                    result.download.html,
                    'text/html;charset=utf-8'
                );
                setSuccessMessage(
                    'The verification email was downloaded for your new address'
                );
            } else {
                setSuccessMessage(
                    'A new verification email has been sent to your new address'
                );
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

            <section className="grid gap-4 rounded border border-slate-200 bg-white p-5">
                <p
                    className={
                        screen === 'error' ? 'text-red-700' : 'text-slate-700'
                    }
                >
                    {message}
                </p>

                {email ? (
                    <p className="text-sm text-slate-600">
                        Email: <strong>{email}</strong>
                    </p>
                ) : null}

                {successMessage ? (
                    <FormNotice tone="success">{successMessage}</FormNotice>
                ) : null}
                {formError ? (
                    <FormNotice tone="error">{formError}</FormNotice>
                ) : null}

                {!hasToken && screen !== 'error' ? (
                    <>
                        <div className="flex flex-wrap gap-3">
                            <Button
                                disabled={isResending}
                                loading={isResending}
                                onClick={() => {
                                    void handleResend();
                                }}
                                type="button"
                                variant="secondary"
                            >
                                Resend verification email
                            </Button>
                        </div>

                        <form
                            className="grid gap-4 rounded border border-slate-200 bg-slate-50 p-4"
                            onKeyDown={enterSubmit.onKeyDown}
                            onSubmit={handleChangeEmail}
                            ref={formRef}
                        >
                            <h2 className="text-sm font-semibold text-slate-900">
                                Change email
                            </h2>
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
                            <Field
                                hint="Use your account password to confirm the change"
                                label="Password"
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
                                        setShowPassword((current) => !current);
                                    }}
                                    placeholder="Enter your password"
                                    showPassword={showPassword}
                                    value={password}
                                />
                            </Field>
                            <Button
                                disabled={isChangingEmail}
                                loading={isChangingEmail}
                                type="submit"
                                variant="primary"
                            >
                                Change email
                            </Button>
                        </form>
                    </>
                ) : null}

                <Link
                    className="text-sm text-slate-600 underline"
                    to={signInPath}
                >
                    Back to sign in
                </Link>
            </section>
        </section>
    );
}

function toVerificationError(error: unknown) {
    if (!(error instanceof BackendError)) {
        return 'Something went wrong';
    }

    if (error.code === 'EMAIL_EXISTS') {
        return 'Email already exists';
    }
    if (error.code === 'INVALID_CREDENTIALS') {
        return 'Email or password is incorrect';
    }
    if (error.code === 'EMAIL_VERIFICATION_PENDING') {
        return 'This account no longer has a pending email change';
    }
    if (error.code === 'STAFF_ACCOUNT_REQUIRED') {
        return 'Staff account is required';
    }

    return error.message;
}
