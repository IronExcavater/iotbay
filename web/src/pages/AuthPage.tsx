import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import { authApi, type RegisterInput } from '../auth/api';
import { useAuth } from '../auth/AuthProvider';
import { downloadHtmlArtifact } from '../auth/downloadHtmlArtifact';
import {
    EMAIL_MAX_LENGTH,
    NAME_MAX_LENGTH,
    PASSWORD_MAX_LENGTH,
} from '../auth/limits';
import { PasswordInput, inputClassName } from '../auth/PasswordInput';
import { PasswordRuleList } from '../auth/PasswordRuleList';
import { getPasswordRules } from '../auth/passwordRules';
import { BackendError } from '../services/http';

type AuthMode = 'signin' | 'signup';

interface FormValues {
    confirmPassword: string;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
}

type FieldName = keyof FormValues;
type FieldErrors = Partial<Record<FieldName, string>>;

const DEFAULT_VALUES: FormValues = {
    confirmPassword: '',
    email: '',
    firstName: '',
    lastName: '',
    password: '',
};

export default function AuthPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { isAuthenticated, isLoading, login } = useAuth();
    const [values, setValues] = useState<FormValues>(DEFAULT_VALUES);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const mode = parseMode(searchParams.get('mode'));
    const isSignUp = mode === 'signup';
    const passwordRules = getPasswordRules(values.password, {
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
    });
    const title = isSignUp ? 'Sign up' : 'Sign in';
    const submitLabel = isSignUp ? 'Create account' : 'Sign in';

    if (isLoading) {
        return <p className="py-8 text-slate-500">Checking session</p>;
    }

    if (isAuthenticated) {
        return <Navigate replace to="/" />;
    }

    function setFieldValue(name: FieldName, value: string) {
        setValues((current) => ({ ...current, [name]: value }));
        setFieldErrors((current) => ({ ...current, [name]: undefined }));
        setFormError(null);
        setSuccessMessage(null);
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        if (!form.reportValidity()) {
            return;
        }

        const nextFieldErrors = validatePasswordFields(
            values,
            isSignUp,
            passwordRules
        );
        setFieldErrors(nextFieldErrors);
        setFormError(null);
        setSuccessMessage(null);

        if (Object.keys(nextFieldErrors).length > 0) {
            return;
        }

        setIsSubmitting(true);
        try {
            if (isSignUp) {
                const result = await authApi.register(toRegisterInput(values));
                setFieldErrors({});
                if (result.download) {
                    downloadHtmlArtifact(result.download);
                    setSuccessMessage('Verification email downloaded');
                } else {
                    setSuccessMessage(
                        'Check your email to verify your account'
                    );
                }
                setValues(DEFAULT_VALUES);
                setShowPassword(false);
                setShowConfirmPassword(false);
            } else {
                await login({
                    email: values.email.trim(),
                    password: values.password,
                });
                navigate('/');
            }
        } catch (error) {
            const nextErrorState = toAuthErrorState(error, isSignUp);
            setFieldErrors(nextErrorState.fieldErrors);
            setFormError(nextErrorState.formError);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className="mx-auto grid max-w-xl gap-6">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {title}
            </h1>

            <form
                className="grid gap-4 rounded border border-slate-200 bg-white p-5"
                noValidate
                onSubmit={handleSubmit}
            >
                {successMessage ? (
                    <p className="text-sm text-emerald-700">{successMessage}</p>
                ) : null}
                {formError ? (
                    <p className="text-sm text-red-700">{formError}</p>
                ) : null}

                {isSignUp ? (
                    <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
                        <label className="grid gap-1 text-sm">
                            <span>First name</span>
                            <input
                                autoComplete="given-name"
                                className={inputClassName(
                                    Boolean(fieldErrors.firstName)
                                )}
                                maxLength={NAME_MAX_LENGTH}
                                required
                                onChange={(event) => {
                                    setFieldValue(
                                        'firstName',
                                        event.target.value
                                    );
                                }}
                                value={values.firstName}
                            />
                            {fieldErrors.firstName ? (
                                <span className="text-red-700">
                                    {fieldErrors.firstName}
                                </span>
                            ) : null}
                        </label>

                        <label className="grid gap-1 text-sm">
                            <span>Last name</span>
                            <input
                                autoComplete="family-name"
                                className={inputClassName(
                                    Boolean(fieldErrors.lastName)
                                )}
                                maxLength={NAME_MAX_LENGTH}
                                required
                                onChange={(event) => {
                                    setFieldValue(
                                        'lastName',
                                        event.target.value
                                    );
                                }}
                                value={values.lastName}
                            />
                            {fieldErrors.lastName ? (
                                <span className="text-red-700">
                                    {fieldErrors.lastName}
                                </span>
                            ) : null}
                        </label>
                    </div>
                ) : null}

                <label className="grid gap-1 text-sm">
                    <span>Email</span>
                    <input
                        autoComplete="email"
                        className={inputClassName(Boolean(fieldErrors.email))}
                        maxLength={EMAIL_MAX_LENGTH}
                        onChange={(event) => {
                            setFieldValue('email', event.target.value);
                        }}
                        required
                        type="email"
                        value={values.email}
                    />
                    {fieldErrors.email ? (
                        <span className="text-red-700">
                            {fieldErrors.email}
                        </span>
                    ) : null}
                </label>

                <label className="grid gap-1 text-sm">
                    <span>Password</span>
                    <PasswordInput
                        autoComplete={
                            isSignUp ? 'new-password' : 'current-password'
                        }
                        hasError={Boolean(fieldErrors.password)}
                        maxLength={PASSWORD_MAX_LENGTH}
                        onChange={(event) => {
                            setFieldValue('password', event.target.value);
                        }}
                        onToggle={() => {
                            setShowPassword((current) => !current);
                        }}
                        showPassword={showPassword}
                        value={values.password}
                    />
                    {isSignUp ? (
                        <PasswordRuleList rules={passwordRules} />
                    ) : null}
                    {fieldErrors.password ? (
                        <span className="text-red-700">
                            {fieldErrors.password}
                        </span>
                    ) : null}
                </label>

                {isSignUp ? (
                    <label className="grid gap-1 text-sm">
                        <span>Confirm password</span>
                        <PasswordInput
                            autoComplete="new-password"
                            hasError={Boolean(fieldErrors.confirmPassword)}
                            maxLength={PASSWORD_MAX_LENGTH}
                            onChange={(event) => {
                                setFieldValue(
                                    'confirmPassword',
                                    event.target.value
                                );
                            }}
                            onToggle={() => {
                                setShowConfirmPassword((current) => !current);
                            }}
                            showPassword={showConfirmPassword}
                            value={values.confirmPassword}
                        />
                        {fieldErrors.confirmPassword ? (
                            <span className="text-red-700">
                                {fieldErrors.confirmPassword}
                            </span>
                        ) : null}
                    </label>
                ) : null}

                {!isSignUp ? (
                    <Link
                        className="text-sm text-slate-600 underline"
                        to="/reset-password"
                    >
                        Forgot password
                    </Link>
                ) : null}

                <button
                    className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                    disabled={isSubmitting}
                    type="submit"
                >
                    {isSubmitting ? 'Working...' : submitLabel}
                </button>
            </form>
        </section>
    );
}

function parseMode(value: string | null): AuthMode {
    return value === 'signup' ? 'signup' : 'signin';
}

function validatePasswordFields(
    values: FormValues,
    isSignUp: boolean,
    passwordRules: ReturnType<typeof getPasswordRules>
) {
    const fieldErrors: FieldErrors = {};

    if (!values.password) {
        fieldErrors.password = 'Password is required';
    } else if (isSignUp && passwordRules.some((rule) => !rule.met)) {
        fieldErrors.password = 'Password requirements are not met';
    }

    if (isSignUp) {
        if (!values.confirmPassword) {
            fieldErrors.confirmPassword = 'Confirm password is required';
        } else if (values.confirmPassword !== values.password) {
            fieldErrors.confirmPassword = 'Passwords do not match';
        }
    }

    return fieldErrors;
}

function toRegisterInput(values: FormValues): RegisterInput {
    return {
        email: values.email.trim(),
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        password: values.password,
    };
}

function toAuthErrorState(error: unknown, isSignUp: boolean) {
    if (!(error instanceof BackendError)) {
        return {
            fieldErrors: {},
            formError: formatMessage('Something went wrong'),
        };
    }

    switch (error.code) {
        case 'EMAIL_EXISTS':
            return {
                fieldErrors: { email: 'Email already exists' },
                formError: null,
            };
        case 'INVALID_CREDENTIALS':
            return {
                fieldErrors: isSignUp
                    ? {}
                    : { password: 'Email or password is incorrect' },
                formError: isSignUp ? 'Email or password is incorrect' : null,
            };
        case 'EMAIL_NOT_VERIFIED':
            return {
                fieldErrors: {},
                formError: 'Check your email to verify your account',
            };
        case 'PASSWORD_TOO_SHORT':
            return {
                fieldErrors: { password: 'Use at least 8 characters' },
                formError: null,
            };
        case 'PASSWORD_NEEDS_NUMBER_OR_SYMBOL':
            return {
                fieldErrors: { password: 'Include a number or symbol' },
                formError: null,
            };
        case 'PASSWORD_HAS_PERSONAL_INFO':
            return {
                fieldErrors: { password: 'Avoid personal information' },
                formError: null,
            };
        case 'PASSWORD_HAS_COMMON_PATTERN':
            return {
                fieldErrors: { password: 'Avoid common patterns' },
                formError: null,
            };
        default:
            return { fieldErrors: {}, formError: formatMessage(error.message) };
    }
}

function formatMessage(message: string) {
    const trimmed = message.trim().replace(/\.+$/, '');
    if (!trimmed) {
        return 'Something went wrong';
    }

    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}
