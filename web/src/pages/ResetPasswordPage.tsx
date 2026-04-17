import { useEffect, useState, type SubmitEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { authApi } from '../auth/api';
import { PasswordRuleList } from '../auth/PasswordRuleList';
import { buildSignInPath, normalizeNextPath } from '../auth/redirects';
import { Button } from '../components/form/Button';
import { Field } from '../components/form/Field';
import { FormNotice } from '../components/form/FormNotice';
import { Input } from '../components/form/Input';
import { PasswordInput } from '../components/form/PasswordInput';
import { TextLink } from '../components/form/TextLink';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/toast/ToastProvider';
import { downloadHtmlAndNotify } from '../services/download';
import {
    backendErrorMessage,
    normalizeMessage,
    resolveBackendError,
} from '../services/http';
import { Email } from '../types/Email';
import { Password } from '../types/Password';
import {
    collectFieldErrors,
    hasFieldErrors,
    type FieldErrors,
} from '../validation/forms';

type ResetFieldName = 'confirmPassword' | 'email' | 'password';
type ResetFieldErrors = FieldErrors<ResetFieldName>;

export default function ResetPasswordPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { showToast } = useToast();
    const initialEmail = searchParams.get('email')?.trim() ?? '';
    const token = searchParams.get('token')?.trim() ?? '';
    const userType =
        searchParams.get('userType')?.trim() === 'staff' ? 'staff' : undefined;
    const nextPath = normalizeNextPath(
        searchParams.get('next'),
        userType === 'staff' ? '/admin' : '/'
    );

    const isResetMode = Boolean(token);
    const pageTitle = isResetMode ? 'Reset password' : 'Forgot password';
    const submitLabel = isResetMode ? 'Reset password' : 'Send reset link';
    const [email, setEmail] = useState(initialEmail);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fieldErrors, setFieldErrors] = useState<ResetFieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const signInPath = buildSignInPath({ email, nextPath, userType });
    const passwordRules = Password.rules(password);

    useEffect(() => {
        setEmail(initialEmail);
        setPassword('');
        setConfirmPassword('');
        setFieldErrors({});
        setFormError(null);
        setIsSubmitting(false);
        setShowPassword(false);
        setShowConfirmPassword(false);
    }, [initialEmail, token, userType]);

    function setFieldError(name: ResetFieldName, value?: string | null) {
        setFieldErrors((current) => ({
            ...current,
            [name]: value || undefined,
        }));
    }

    function handlePasswordChange(nextPassword: string) {
        setPassword(nextPassword);

        if (!confirmPassword) {
            setFieldError('confirmPassword');
            return;
        }

        setFieldError(
            'confirmPassword',
            getResetConfirmPasswordError(confirmPassword, nextPassword)
        );
    }

    function handleConfirmPasswordChange(nextConfirmPassword: string) {
        setConfirmPassword(nextConfirmPassword);
        setFieldError(
            'confirmPassword',
            getResetConfirmPasswordError(nextConfirmPassword, password)
        );
    }

    async function submitPasswordReset() {
        await authApi.resetPassword({ password, token });
        navigate(signInPath, {
            replace: true,
            state: { successMessage: 'Password reset successful' },
        });
    }

    async function submitResetRequest() {
        const normalizedEmail = Email.assess(email).value;
        if (!normalizedEmail) {
            return;
        }

        const result = await authApi.forgotPassword({
            email: normalizedEmail,
            userType,
        });

        downloadHtmlAndNotify(result?.download, showToast, {
            downloadedMessage: 'Reset email downloaded',
            sentMessage: 'Reset link sent if it exists',
        });
    }

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setFormError(null);

        const nextFieldErrors = getResetFieldErrors({
            confirmPassword,
            email,
            isResetMode,
            password,
            passwordRulesMet: passwordRules.every((rule) => rule.met),
        });

        setFieldErrors(nextFieldErrors);
        if (hasFieldErrors(nextFieldErrors)) {
            return;
        }

        setIsSubmitting(true);

        try {
            if (isResetMode) {
                await submitPasswordReset();
                return;
            }

            await submitResetRequest();
        } catch (caughtError) {
            setFormError(toResetError(caughtError));
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className="mx-auto grid max-w-xl gap-6">
            <PageHeader title={pageTitle} />

            <form
                className="grid gap-4 rounded border border-slate-200 bg-white p-5"
                noValidate
                onSubmit={handleSubmit}
            >
                {formError ? (
                    <FormNotice tone="error">{formError}</FormNotice>
                ) : null}

                {isResetMode ? (
                    <>
                        <Field
                            error={fieldErrors.password}
                            label="New password"
                            required
                        >
                            <PasswordInput
                                autoComplete="new-password"
                                hasError={Boolean(fieldErrors.password)}
                                maxLength={Password.MAX_LENGTH}
                                name="newPassword"
                                onBlur={() => {
                                    if (!password) {
                                        setFieldError(
                                            'password',
                                            'Password is required'
                                        );
                                        return;
                                    }

                                    const assessment =
                                        Password.assess(password);
                                    setFieldError(
                                        'password',
                                        assessment.error
                                            ? normalizeMessage(assessment.error)
                                            : null
                                    );
                                }}
                                onChange={(event) => {
                                    handlePasswordChange(
                                        Password.formatInput(event.target.value)
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

                        <Field
                            error={fieldErrors.confirmPassword}
                            label="Confirm password"
                            required
                        >
                            <PasswordInput
                                autoComplete="new-password"
                                hasError={Boolean(fieldErrors.confirmPassword)}
                                maxLength={Password.MAX_LENGTH}
                                name="confirmPassword"
                                onBlur={() => {
                                    setFieldError(
                                        'confirmPassword',
                                        getResetConfirmPasswordError(
                                            confirmPassword,
                                            password
                                        )
                                    );
                                }}
                                onChange={(event) => {
                                    handleConfirmPasswordChange(
                                        Password.formatInput(event.target.value)
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
                    <Field error={fieldErrors.email} label="Email" required>
                        <Input
                            autoComplete="email"
                            hasError={Boolean(fieldErrors.email)}
                            maxLength={Email.MAX_LENGTH}
                            name="email"
                            onBlur={() => {
                                setFieldError(
                                    'email',
                                    Email.assess(email).error
                                );
                            }}
                            onChange={(event) => {
                                setEmail(Email.formatInput(event.target.value));
                                setFieldError('email');
                                setFormError(null);
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
                    {submitLabel}
                </Button>

                <TextLink to={signInPath}>Back to sign in</TextLink>
            </form>
        </section>
    );
}

function getResetFieldErrors({
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
    if (!isResetMode) {
        return collectFieldErrors<ResetFieldName>({
            email: Email.assess(email),
        });
    }

    const passwordAssessment = Password.assess(password);

    return collectFieldErrors<ResetFieldName>({
        confirmPassword: getResetConfirmPasswordError(
            confirmPassword,
            password
        ),
        password: !password
            ? 'Password is required'
            : passwordAssessment.error
              ? normalizeMessage(passwordAssessment.error)
              : !passwordRulesMet
                ? 'Password requirements are not met'
                : null,
    });
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
    if (!confirmPassword) {
        return 'Confirm password is required';
    }

    return confirmPassword !== password ? 'Passwords do not match' : null;
}
