import { useState, type ChangeEventHandler, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import { type RegisterInput } from '../auth/api';
import { useAuth } from '../auth/AuthProvider';
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
    const { isAuthenticated, isLoading, login, register } = useAuth();
    const [values, setValues] = useState<FormValues>(DEFAULT_VALUES);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
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
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const nextFieldErrors = validateForm(values, isSignUp, passwordRules);
        setFieldErrors(nextFieldErrors);
        setFormError(null);

        if (Object.keys(nextFieldErrors).length > 0) {
            return;
        }

        setIsSubmitting(true);
        try {
            if (isSignUp) {
                await register(toRegisterInput(values));
            } else {
                await login({
                    email: values.email.trim(),
                    password: values.password,
                });
            }
            navigate('/');
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
                                    fieldErrors.firstName
                                )}
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
                                className={inputClassName(fieldErrors.lastName)}
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
                        className={inputClassName(fieldErrors.email)}
                        onChange={(event) => {
                            setFieldValue('email', event.target.value);
                        }}
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
                        error={fieldErrors.password}
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
                            error={fieldErrors.confirmPassword}
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

function validateForm(
    values: FormValues,
    isSignUp: boolean,
    passwordRules: ReturnType<typeof getPasswordRules>
) {
    const fieldErrors: FieldErrors = {};

    if (!values.email.trim()) {
        fieldErrors.email = 'Email is required';
    } else if (!isValidEmail(values.email)) {
        fieldErrors.email = 'Email must be valid';
    }

    if (!values.password) {
        fieldErrors.password = 'Password is required';
    } else if (isSignUp && passwordRules.some((rule) => !rule.met)) {
        fieldErrors.password = 'Password requirements are not met';
    }

    if (isSignUp) {
        if (!values.firstName.trim()) {
            fieldErrors.firstName = 'First name is required';
        }

        if (!values.lastName.trim()) {
            fieldErrors.lastName = 'Last name is required';
        }

        if (!values.confirmPassword) {
            fieldErrors.confirmPassword = 'Confirm password is required';
        } else if (values.confirmPassword !== values.password) {
            fieldErrors.confirmPassword = 'Passwords do not match';
        }
    }

    return fieldErrors;
}

function isValidEmail(value: string) {
    const [localPart, domain] = value.trim().split('@');
    return Boolean(localPart && domain && domain.includes('.'));
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

function inputClassName(error?: string) {
    return [
        'w-full rounded border px-3 py-2',
        error ? 'border-red-500' : 'border-slate-300',
    ].join(' ');
}

function PasswordRuleList({
    rules,
}: {
    rules: ReturnType<typeof getPasswordRules>;
}) {
    return (
        <ul
            aria-label="Password requirements"
            className="grid gap-1.5 text-sm text-slate-600"
        >
            {rules.map((rule) => (
                <li className="flex items-start gap-2" key={rule.label}>
                    <span
                        aria-hidden="true"
                        className={[
                            'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] leading-none',
                            rule.met
                                ? 'border-emerald-600 bg-emerald-600 text-white'
                                : 'border-slate-300 bg-white text-transparent',
                        ].join(' ')}
                    >
                        ✓
                    </span>
                    <span className={rule.met ? 'text-slate-900' : undefined}>
                        <span className="sr-only">
                            {rule.met ? 'Met: ' : 'Needed: '}
                        </span>
                        {rule.label}
                    </span>
                </li>
            ))}
        </ul>
    );
}

function PasswordInput({
    autoComplete,
    error,
    onChange,
    onToggle,
    showPassword,
    value,
}: {
    autoComplete: string;
    error?: string;
    onChange: ChangeEventHandler<HTMLInputElement>;
    onToggle: () => void;
    showPassword: boolean;
    value: string;
}) {
    return (
        <div className="relative">
            <input
                autoComplete={autoComplete}
                className={`${inputClassName(error)} pr-11`}
                onChange={onChange}
                type={showPassword ? 'text' : 'password'}
                value={value}
            />
            <button
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                onClick={onToggle}
                type="button"
            >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
        </div>
    );
}

function EyeIcon() {
    return (
        <svg
            aria-hidden="true"
            fill="none"
            height="18"
            stroke="currentColor"
            strokeWidth="1.8"
            viewBox="0 0 24 24"
            width="18"
        >
            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

function EyeOffIcon() {
    return (
        <svg
            aria-hidden="true"
            fill="none"
            height="18"
            stroke="currentColor"
            strokeWidth="1.8"
            viewBox="0 0 24 24"
            width="18"
        >
            <path d="M3 3l18 18" />
            <path d="M10.6 6.4A10.7 10.7 0 0 1 12 6c6.5 0 10 6 10 6a17.5 17.5 0 0 1-4.1 4.7" />
            <path d="M6.7 6.7C4 8.4 2 12 2 12s3.5 6 10 6c1.7 0 3.2-.4 4.5-1" />
            <path d="M14.1 14.1A3 3 0 0 1 9.9 9.9" />
        </svg>
    );
}
