import { useEffect, useState, type SubmitEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { authApi } from '../auth/api';
import {
    AuthPageLayout,
    authPanelClassName,
} from '../auth/AuthPageLayout';
import { PasswordRuleList } from '../auth/PasswordRuleList';
import { buildSignInPath } from '../auth/redirects';
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
import { useToast } from '../components/toast/ToastProvider';
import { downloadHtmlAndNotify } from '../services/download';
import {
    backendErrorMessage,
    normalizeMessage,
    resolveBackendError,
} from '../services/http';

type ResetPageMode = 'forgot' | 'reset';
type PasswordFieldName = 'confirmPassword' | 'password';
type ResetFormValues = {
    confirmPassword: string;
    email: string;
    password: string;
};

const RESET_PAGE_CONFIG: Record<
    ResetPageMode,
    {
        submitLabel: string;
        title: string;
    }
> = {
    forgot: {
        submitLabel: 'Send reset link',
        title: 'Forgot password',
    },
    reset: {
        submitLabel: 'Reset password',
        title: 'Reset password',
    },
};

const DEFAULT_PASSWORD_VISIBILITY: Record<PasswordFieldName, boolean> = {
    confirmPassword: false,
    password: false,
};

function createResetFormValues(email = ''): ResetFormValues {
    return {
        confirmPassword: '',
        email,
        password: '',
    };
}

export default function ResetPasswordPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { showToast } = useToast();
    const initialEmail = searchParams.get('email')?.trim() ?? '';
    const token = searchParams.get('token')?.trim() ?? '';
    const userType = searchParams.get('userType')?.trim() === 'staff'
        ? 'staff'
        : undefined;
    const mode: ResetPageMode = token ? 'reset' : 'forgot';
    const pageConfig = RESET_PAGE_CONFIG[mode];

    const [values, setValues] = useState<ResetFormValues>(() =>
        createResetFormValues(initialEmail)
    );
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [passwordVisibility, setPasswordVisibility] = useState(
        DEFAULT_PASSWORD_VISIBILITY
    );

    const { confirmPassword, email, password } = values;
    const signInPath = buildSignInPath({ email, userType });
    const passwordRules = getPasswordRules(password);

    useEffect(() => {
        setValues(createResetFormValues(initialEmail));
        setError(null);
        setIsSubmitting(false);
        setPasswordVisibility(DEFAULT_PASSWORD_VISIBILITY);
    }, [initialEmail, token, userType]);

    function updateValue(name: keyof ResetFormValues, value: string) {
        setValues((current) => ({
            ...current,
            [name]: value,
        }));
    }

    function togglePasswordVisibility(name: PasswordFieldName) {
        setPasswordVisibility((current) => ({
            ...current,
            [name]: !current[name],
        }));
    }

    function handleEmailBlur() {
        setError(validateEmail(email));
    }

    function handleEmailChange(nextEmail: string) {
        updateValue('email', nextEmail);
        setError(null);
    }

    function handlePasswordChange(nextPassword: string) {
        updateValue('password', nextPassword);
        setError(
            confirmPassword
                ? getResetConfirmPasswordError(confirmPassword, nextPassword)
                : null
        );
    }

    function handleConfirmPasswordChange(nextConfirmPassword: string) {
        updateValue('confirmPassword', nextConfirmPassword);
        setError(getResetConfirmPasswordError(nextConfirmPassword, password));
    }

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();

        const validationError = getResetFormError({
            confirmPassword,
            email,
            isResetMode: mode === 'reset',
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
            if (mode === 'reset') {
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
        <AuthPageLayout title={pageConfig.title}>
            <form
                className={authPanelClassName}
                noValidate
                onSubmit={handleSubmit}
            >
                {error ? <FormNotice tone="error">{error}</FormNotice> : null}

                {mode === 'reset' ? (
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
                                    togglePasswordVisibility('password');
                                }}
                                placeholder="Choose a new password"
                                showPassword={passwordVisibility.password}
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
                                    togglePasswordVisibility('confirmPassword');
                                }}
                                placeholder="Re-enter your new password"
                                showPassword={
                                    passwordVisibility.confirmPassword
                                }
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
                            onBlur={handleEmailBlur}
                            onChange={(event) => {
                                handleEmailChange(
                                    sanitizeEmail(event.target.value)
                                );
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
                    {pageConfig.submitLabel}
                </Button>

                <Link className={textButtonClassName} to={signInPath}>
                    Back to sign in
                </Link>
            </form>
        </AuthPageLayout>
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
    if (!isResetMode) {
        return validateEmail(email);
    }

    if (!password) {
        return 'Password is required';
    }

    const passwordError = PASSWORD_VALIDATOR.tryValidate(password).error?.message;
    if (passwordError) {
        return normalizeMessage(passwordError);
    }

    if (!passwordRulesMet) {
        return 'Password requirements are not met';
    }

    if (!confirmPassword) {
        return 'Confirm password is required';
    }

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
    if (!confirmPassword) {
        return null;
    }

    return confirmPassword !== password ? 'Passwords do not match' : null;
}
