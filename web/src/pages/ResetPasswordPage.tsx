import { useEffect, useState, type SubmitEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { authApi } from '../auth/api';
import { PasswordRuleList } from '../auth/PasswordRuleList';
import { buildSignInPath, normalizeNextPath } from '../auth/redirects';
import {
    EMAIL_MAX_LENGTH,
    getPasswordRules,
    PASSWORD_MAX_LENGTH,
    PASSWORD_VALIDATOR,
    sanitizeEmail,
    sanitizePasswordInput,
    validateEmail,
} from '../auth/validation';
import { Button, textButtonClassName } from '../components/form/Button';
import { Field } from '../components/form/Field';
import { FormNotice } from '../components/form/FormNotice';
import { inputClassName } from '../components/form/Input';
import { PasswordInput } from '../components/form/PasswordInput';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/toast/ToastProvider';
import { downloadHtmlAndNotify } from '../services/download';
import {
    backendErrorMessage,
    normalizeMessage,
    resolveBackendError,
} from '../services/http';

export default function ResetPasswordPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { showToast } = useToast();
    const initialEmail = searchParams.get('email')?.trim() ?? '';
    const token = searchParams.get('token')?.trim() ?? '';
    const userType = searchParams.get('userType')?.trim() === 'staff'
        ? 'staff'
        : undefined;
    const nextPath = normalizeNextPath(
        searchParams.get('next'),
        userType === 'staff' ? '/admin' : '/'
    );

    const isResetMode = Boolean(token);
    const [email, setEmail] = useState(initialEmail);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const signInPath = buildSignInPath({ email, nextPath, userType });
    const passwordRules = getPasswordRules(password);

    useEffect(() => {
        setEmail(initialEmail);
        setPassword('');
        setConfirmPassword('');
        setError(null);
        setIsSubmitting(false);
        setShowPassword(false);
        setShowConfirmPassword(false);
    }, [initialEmail, token, userType]);

    function handlePasswordChange(nextPassword: string) {
        setPassword(nextPassword);

        if (!confirmPassword) {
            setError(null);
            return;
        }

        setError(getResetConfirmPasswordError(confirmPassword, nextPassword));
    }

    function handleConfirmPasswordChange(nextConfirmPassword: string) {
        setConfirmPassword(nextConfirmPassword);
        setError(getResetConfirmPasswordError(nextConfirmPassword, password));
    }

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();

        const validationError = getResetFormError({
            confirmPassword,
            email,
            isResetMode,
            password,
            passwordRulesMet: passwordRules.every((rule) => rule.met),
        });

        if (validationError) {
            setError(validationError);
            return;
        }

        setError(null);
        setIsSubmitting(true);

        try {
            if (isResetMode) {
                await authApi.resetPassword({ password, token });
                navigate(signInPath, {
                    replace: true,
                    state: { successMessage: 'Password reset successful' },
                });
                return;
            }

            const result = await authApi.forgotPassword({
                email: email.trim(),
                userType,
            });
            downloadHtmlAndNotify(result?.download, showToast, {
                downloadedMessage: 'Reset email downloaded',
                sentMessage: 'Reset link sent if it exists',
            });
        } catch (caughtError) {
            setError(toResetError(caughtError));
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className="mx-auto grid max-w-xl gap-6">
            <PageHeader title={isResetMode ? 'Reset password' : 'Forgot password'} />

            <form
                className="grid gap-4 rounded border border-slate-200 bg-white p-5"
                noValidate
                onSubmit={handleSubmit}
            >
                {error ? <FormNotice tone="error">{error}</FormNotice> : null}

                {isResetMode ? (
                    <>
                        <Field label="New password" required>
                            <PasswordInput
                                autoComplete="new-password"
                                hasError={Boolean(error)}
                                maxLength={PASSWORD_MAX_LENGTH}
                                name="newPassword"
                                onChange={(event) => {
                                    handlePasswordChange(
                                        sanitizePasswordInput(
                                            event.target.value
                                        )
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
                                autoComplete="new-password"
                                hasError={Boolean(error)}
                                maxLength={PASSWORD_MAX_LENGTH}
                                name="confirmPassword"
                                onChange={(event) => {
                                    handleConfirmPasswordChange(
                                        sanitizePasswordInput(
                                            event.target.value
                                        )
                                    );
                                }}
                                onToggle={() => {
                                    setShowConfirmPassword((current) => !current);
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
                            autoComplete="email"
                            className={inputClassName(Boolean(error))}
                            maxLength={EMAIL_MAX_LENGTH}
                            name="email"
                            onBlur={() => {
                                setError(validateEmail(email));
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
                    {isResetMode ? 'Reset password' : 'Send reset link'}
                </Button>

                <Link className={textButtonClassName} to={signInPath}>
                    Back to sign in
                </Link>
            </form>
        </section>
    );
}

function getResetFormError({
    confirmPassword,
    email,
    isResetMode,
    password,
    passwordRulesMet,
}: {
    confirmPassword: string;
    email: string;
    isResetMode: boolean;
    password: string;
    passwordRulesMet: boolean;
}) {
    if (!isResetMode)
        return validateEmail(email);

    if (!password)
        return 'Password is required';

    const passwordError = PASSWORD_VALIDATOR.tryValidate(password).error?.message;

    if (passwordError)
        return normalizeMessage(passwordError);

    if (!passwordRulesMet)
        return 'Password requirements are not met';

    if (!confirmPassword)
        return 'Confirm password is required';

    return getResetConfirmPasswordError(confirmPassword, password);
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

function getResetConfirmPasswordError(
    confirmPassword: string,
    password: string
) {
    if (!confirmPassword)
        return null;

    return confirmPassword !== password ? 'Passwords do not match' : null;
}
