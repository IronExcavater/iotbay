import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { authApi } from '../auth/api';
import { EMAIL_MAX_LENGTH, PASSWORD_MAX_LENGTH } from '../auth/limits';
import { PasswordRuleList } from '../auth/PasswordRuleList';
import { getPasswordRules, PASSWORD_VALIDATOR } from '../auth/passwordRules';
import {
    sanitizeEmail,
    sanitizePasswordInput,
    validateEmail,
} from '../auth/validation';
import { Button, textButtonClassName } from '../components/form/Button';
import { Field } from '../components/form/Field';
import { FormNotice } from '../components/form/FormNotice';
import { inputClassName } from '../components/form/Input';
import { PasswordInput } from '../components/form/PasswordInput';
import { useEnterSubmit } from '../components/form/useEnterSubmit';
import { useToast } from '../components/toast/ToastProvider';
import { downloadHtml } from '../services/download';
import {
    backendErrorMessage,
    normalizeMessage,
    resolveBackendError,
} from '../services/http';

export default function ResetPasswordPage() {
    const formRef = useRef<HTMLFormElement | null>(null);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { showToast } = useToast();
    const initialEmail = searchParams.get('email')?.trim() ?? '';
    const token = searchParams.get('token')?.trim() ?? '';
    const userType = searchParams.get('userType')?.trim() ?? '';
    const hasToken = token.length > 0;
    const signInPath = authSignInPath(initialEmail, userType);

    const [email, setEmail] = useState(initialEmail);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const passwordRules = getPasswordRules(password);
    const enterSubmit = useEnterSubmit({
        canSubmit: () =>
            !isSubmitting &&
            canSubmitResetForm({
                confirmPassword,
                email,
                hasToken,
                password,
                passwordRulesMet: passwordRules.every((rule) => rule.met),
            }),
        formRef,
    });

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);

        if (hasToken) {
            if (!password) {
                setError('Password is required');
                return;
            }
            const passwordError =
                PASSWORD_VALIDATOR.tryValidate(password).error?.message;
            if (passwordError) {
                setError(normalizeMessage(passwordError));
                return;
            }
            if (passwordRules.some((rule) => !rule.met)) {
                setError('Password requirements are not met');
                return;
            }
            if (!confirmPassword) {
                setError('Confirm password is required');
                return;
            }
            if (confirmPassword !== password) {
                setError('Passwords do not match');
                return;
            }
        } else {
            const emailError = validateEmail(email);
            if (emailError) {
                setError(emailError);
                return;
            }
        }

        setIsSubmitting(true);
        try {
            if (hasToken) {
                await authApi.resetPassword({ password, token });
                navigate(signInPath, {
                    replace: true,
                    state: { successMessage: 'Password reset successful' },
                });
            } else {
                const result = await authApi.forgotPassword({
                    email: email.trim(),
                    userType: userType === 'staff' ? 'staff' : undefined,
                });
                if (downloadHtml(result?.download)) {
                    showToast('Reset email downloaded');
                } else {
                    showToast('Reset link sent if it exists');
                }
            }
        } catch (caughtError) {
            setError(toResetError(caughtError));
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className="mx-auto grid max-w-xl gap-6">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {hasToken ? 'Reset password' : 'Forgot password'}
            </h1>

            <form
                className="grid gap-4 rounded border border-slate-200 bg-white p-5"
                noValidate
                onKeyDown={enterSubmit.onKeyDown}
                onSubmit={handleSubmit}
                ref={formRef}
            >
                {error ? <FormNotice tone="error">{error}</FormNotice> : null}

                {hasToken ? (
                    <>
                        <Field label="New password" required>
                            <PasswordInput
                                hasError={Boolean(error)}
                                maxLength={PASSWORD_MAX_LENGTH}
                                onChange={(event) => {
                                    const nextPassword = sanitizePasswordInput(
                                        event.target.value
                                    );
                                    setPassword(nextPassword);
                                    setError(
                                        confirmPassword
                                            ? getResetConfirmPasswordError(
                                                  confirmPassword,
                                                  nextPassword
                                              )
                                            : null
                                    );
                                }}
                                onToggle={() => {
                                    setShowPassword((current) => !current);
                                }}
                                placeholder="Choose a new password"
                                showPassword={showPassword}
                                value={password}
                            />
                            <PasswordRuleList rules={passwordRules} />
                        </Field>

                        <Field label="Confirm password" required>
                            <PasswordInput
                                hasError={Boolean(error)}
                                maxLength={PASSWORD_MAX_LENGTH}
                                onChange={(event) => {
                                    const nextConfirmPassword =
                                        sanitizePasswordInput(
                                            event.target.value
                                        );
                                    setConfirmPassword(nextConfirmPassword);
                                    setError(
                                        getResetConfirmPasswordError(
                                            nextConfirmPassword,
                                            password
                                        )
                                    );
                                }}
                                onToggle={() => {
                                    setShowConfirmPassword(
                                        (current) => !current
                                    );
                                }}
                                placeholder="Re-enter your new password"
                                showPassword={showConfirmPassword}
                                value={confirmPassword}
                            />
                        </Field>
                    </>
                ) : (
                    <Field label="Email" required>
                        <input
                            className={inputClassName(Boolean(error))}
                            maxLength={EMAIL_MAX_LENGTH}
                            onBlur={() => {
                                const emailError = validateEmail(email);
                                setError(emailError);
                            }}
                            onChange={(event) => {
                                setEmail(sanitizeEmail(event.target.value));
                                setError(null);
                            }}
                            placeholder="jane.doe@email.com"
                            type="email"
                            value={email}
                        />
                    </Field>
                )}

                <Button
                    disabled={isSubmitting}
                    loading={isSubmitting}
                    type="submit"
                    variant="primary"
                >
                    {hasToken ? 'Reset password' : 'Send reset link'}
                </Button>

                <Link className={textButtonClassName} to={signInPath}>
                    Back to sign in
                </Link>
            </form>
        </section>
    );
}

function toResetError(error: unknown) {
    return resolveBackendError<string>(
        error,
        {
            INVALID_PASSWORD_RESET_TOKEN: (backendError) =>
                backendErrorMessage(backendError.code),
            PASSWORD_HAS_COMMON_PATTERN: (backendError) =>
                backendErrorMessage(backendError.code),
            PASSWORD_HAS_PERSONAL_INFO: (backendError) =>
                backendErrorMessage(backendError.code),
            PASSWORD_NEEDS_NUMBER_OR_SYMBOL: (backendError) =>
                backendErrorMessage(backendError.code),
            PASSWORD_TOO_SHORT: (backendError) =>
                backendErrorMessage(backendError.code),
        },
        (message) => message
    );
}

function authSignInPath(email: string, userType: string) {
    const query = new URLSearchParams({ mode: 'signin' });
    if (email) {
        query.set('email', email);
    }
    if (userType === 'staff') {
        query.set('userType', 'staff');
        query.set('next', '/admin');
    }
    return `/auth?${query.toString()}`;
}

function canSubmitResetForm({
    confirmPassword,
    email,
    hasToken,
    password,
    passwordRulesMet,
}: {
    confirmPassword: string;
    email: string;
    hasToken: boolean;
    password: string;
    passwordRulesMet: boolean;
}) {
    if (!hasToken) {
        return !validateEmail(email);
    }

    if (!password || !confirmPassword || confirmPassword !== password) {
        return false;
    }

    return !PASSWORD_VALIDATOR.tryValidate(password).error && passwordRulesMet;
}

function getResetConfirmPasswordError(
    confirmPassword: string,
    password: string
) {
    if (!confirmPassword) {
        return null;
    }

    return confirmPassword !== password ? 'Passwords do not match' : null;
}
