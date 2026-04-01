import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { authApi } from '../auth/api';
import { downloadHtmlArtifact } from '../auth/downloadHtmlArtifact';
import { EMAIL_MAX_LENGTH, PASSWORD_MAX_LENGTH } from '../auth/limits';
import { PasswordInput, inputClassName } from '../auth/PasswordInput';
import { PasswordRuleList } from '../auth/PasswordRuleList';
import { getPasswordRules } from '../auth/passwordRules';
import { BackendError } from '../services/http';

export default function ResetPasswordPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token')?.trim() ?? '';
    const hasToken = token.length > 0;

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const passwordRules = getPasswordRules(password);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setSuccess(null);

        if (hasToken) {
            if (!password) {
                setError('Password is required');
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
        } else if (!email.trim()) {
            setError('Email is required');
            return;
        }

        setIsSubmitting(true);
        try {
            if (hasToken) {
                await authApi.resetPassword({ password, token });
                setSuccess('Password reset successful');
                navigate('/auth?mode=signin');
            } else {
                const result = await authApi.forgotPassword({
                    email: email.trim(),
                });
                if (result?.download) {
                    downloadHtmlArtifact(result.download);
                    setSuccess('Reset email downloaded');
                } else {
                    setSuccess(
                        'If the account exists, a reset link has been sent'
                    );
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
                onSubmit={handleSubmit}
            >
                {error ? <p className="text-sm text-red-700">{error}</p> : null}
                {success ? (
                    <p className="text-sm text-emerald-700">{success}</p>
                ) : null}

                {hasToken ? (
                    <>
                        <label className="grid gap-1 text-sm">
                            <span>New password</span>
                            <PasswordInput
                                hasError={Boolean(error)}
                                maxLength={PASSWORD_MAX_LENGTH}
                                onChange={(event) => {
                                    setPassword(event.target.value);
                                    setError(null);
                                }}
                                onToggle={() => {
                                    setShowPassword((current) => !current);
                                }}
                                showPassword={showPassword}
                                value={password}
                            />
                            <PasswordRuleList rules={passwordRules} />
                        </label>

                        <label className="grid gap-1 text-sm">
                            <span>Confirm password</span>
                            <PasswordInput
                                hasError={Boolean(error)}
                                maxLength={PASSWORD_MAX_LENGTH}
                                onChange={(event) => {
                                    setConfirmPassword(event.target.value);
                                    setError(null);
                                }}
                                onToggle={() => {
                                    setShowConfirmPassword(
                                        (current) => !current
                                    );
                                }}
                                showPassword={showConfirmPassword}
                                value={confirmPassword}
                            />
                        </label>
                    </>
                ) : (
                    <label className="grid gap-1 text-sm">
                        <span>Email</span>
                        <input
                            className={inputClassName(Boolean(error))}
                            maxLength={EMAIL_MAX_LENGTH}
                            onChange={(event) => {
                                setEmail(event.target.value);
                                setError(null);
                            }}
                            type="email"
                            value={email}
                        />
                    </label>
                )}

                <button
                    className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                    disabled={isSubmitting}
                    type="submit"
                >
                    {isSubmitting
                        ? 'Working...'
                        : hasToken
                          ? 'Reset password'
                          : 'Send reset link'}
                </button>

                <Link
                    className="text-sm text-slate-600 underline"
                    to="/auth?mode=signin"
                >
                    Back to sign in
                </Link>
            </form>
        </section>
    );
}

function toResetError(error: unknown) {
    if (!(error instanceof BackendError)) {
        return 'Something went wrong';
    }

    if (error.code === 'INVALID_PASSWORD_RESET_TOKEN') {
        return 'Reset link is invalid or expired';
    }
    if (error.code === 'PASSWORD_TOO_SHORT') {
        return 'Use at least 8 characters';
    }
    if (error.code === 'PASSWORD_NEEDS_NUMBER_OR_SYMBOL') {
        return 'Include a number or symbol';
    }
    if (error.code === 'PASSWORD_HAS_PERSONAL_INFO') {
        return 'Avoid personal information';
    }
    if (error.code === 'PASSWORD_HAS_COMMON_PATTERN') {
        return 'Avoid common patterns';
    }

    return error.message;
}
