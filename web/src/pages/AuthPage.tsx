import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import { type RegisterInput } from '../auth/api';
import { useAuth } from '../auth/AuthProvider';
import { getPasswordRules } from '../auth/passwordRules';
import { toErrorMessage } from '../services/errors';

type AuthMode = 'signin' | 'signup';

interface FormValues {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
}

interface FormErrors {
    email?: string;
    firstName?: string;
    lastName?: string;
    password?: string;
}

const DEFAULT_VALUES: FormValues = {
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
    const [errors, setErrors] = useState<FormErrors>({});
    const [serverError, setServerError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const mode = parseMode(searchParams.get('mode'));

    if (isLoading) {
        return <p className="py-8 text-slate-500">Checking session.</p>;
    }

    if (isAuthenticated) {
        return <Navigate replace to="/" />;
    }

    const isSignUp = mode === 'signup';
    const passwordRules = getPasswordRules(values.password);
    const title = isSignUp ? 'Sign up' : 'Sign in';
    const submitLabel = isSignUp ? 'Create account' : 'Sign in';
    const passwordAutoComplete = isSignUp ? 'new-password' : 'current-password';

    function setFieldValue(name: keyof FormValues, value: string) {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: undefined }));
        setServerError(null);
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const nextErrors = validate(values, mode);
        setErrors(nextErrors);
        setServerError(null);

        if (Object.keys(nextErrors).length > 0) {
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
            setServerError(toErrorMessage(error));
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
                {serverError ? (
                    <p className="text-sm text-red-700">{serverError}</p>
                ) : null}

                {isSignUp ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="grid gap-1 text-sm">
                            <span>First name</span>
                            <input
                                autoComplete="given-name"
                                className="rounded border border-slate-300 px-3 py-2"
                                onChange={(event) => {
                                    setFieldValue(
                                        'firstName',
                                        event.target.value
                                    );
                                }}
                                value={values.firstName}
                            />
                            {errors.firstName ? (
                                <span className="text-red-700">
                                    {errors.firstName}
                                </span>
                            ) : null}
                        </label>

                        <label className="grid gap-1 text-sm">
                            <span>Last name</span>
                            <input
                                autoComplete="family-name"
                                className="rounded border border-slate-300 px-3 py-2"
                                onChange={(event) => {
                                    setFieldValue(
                                        'lastName',
                                        event.target.value
                                    );
                                }}
                                value={values.lastName}
                            />
                            {errors.lastName ? (
                                <span className="text-red-700">
                                    {errors.lastName}
                                </span>
                            ) : null}
                        </label>
                    </div>
                ) : null}

                <label className="grid gap-1 text-sm">
                    <span>Email</span>
                    <input
                        autoComplete="email"
                        className="rounded border border-slate-300 px-3 py-2"
                        onChange={(event) => {
                            setFieldValue('email', event.target.value);
                        }}
                        type="email"
                        value={values.email}
                    />
                    {errors.email ? (
                        <span className="text-red-700">{errors.email}</span>
                    ) : null}
                </label>

                <label className="grid gap-1 text-sm">
                    <span>Password</span>
                    <input
                        autoComplete={passwordAutoComplete}
                        className="rounded border border-slate-300 px-3 py-2"
                        onChange={(event) => {
                            setFieldValue('password', event.target.value);
                        }}
                        type="password"
                        value={values.password}
                    />
                    {isSignUp ? (
                        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
                            {passwordRules.map((rule) => (
                                <li
                                    className={
                                        rule.met ? 'text-slate-900' : undefined
                                    }
                                    key={rule.label}
                                >
                                    {rule.label}
                                </li>
                            ))}
                        </ul>
                    ) : null}
                    {!isSignUp && errors.password ? (
                        <span className="text-red-700">{errors.password}</span>
                    ) : null}
                </label>

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

function validate(values: FormValues, mode: AuthMode): FormErrors {
    const errors: FormErrors = {};
    const email = values.email.trim();
    const password = values.password.trim();

    if (!email) {
        errors.email = 'Enter your email address.';
    } else if (!isValidEmail(email)) {
        errors.email = 'Enter a valid email address.';
    }

    if (!password) {
        errors.password = 'Enter your password.';
    } else if (
        mode === 'signup' &&
        getPasswordRules(password).some((rule) => !rule.met)
    ) {
        errors.password = 'Password requirements are not met.';
    }

    if (mode === 'signup') {
        if (!values.firstName.trim()) {
            errors.firstName = 'Enter your first name.';
        }

        if (!values.lastName.trim()) {
            errors.lastName = 'Enter your last name.';
        }
    }

    return errors;
}

function isValidEmail(value: string) {
    const [localPart, domain] = value.split('@');
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
