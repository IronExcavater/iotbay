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
    const passwordError = getPasswordError(isSignUp, values.password);
    const title = isSignUp ? 'Sign up' : 'Sign in';
    const submitLabel = isSignUp ? 'Create account' : 'Sign in';
    const passwordAutoComplete = isSignUp ? 'new-password' : 'current-password';

    function setFieldValue(name: keyof FormValues, value: string) {
        setValues((current) => ({ ...current, [name]: value }));
        setServerError(null);
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setServerError(null);
        const form = event.currentTarget;

        if (!form.reportValidity()) {
            return;
        }

        if (passwordError) {
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
                                required
                                value={values.firstName}
                            />
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
                                required
                                value={values.lastName}
                            />
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
                        required
                        type="email"
                        value={values.email}
                    />
                </label>

                <label className="grid gap-1 text-sm">
                    <span>Password</span>
                    <input
                        autoComplete={passwordAutoComplete}
                        className="rounded border border-slate-300 px-3 py-2"
                        onChange={(event) => {
                            setFieldValue('password', event.target.value);
                        }}
                        required
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
                    {passwordError ? (
                        <span className="text-red-700">{passwordError}</span>
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

function getPasswordError(isSignUp: boolean, password: string) {
    if (!isSignUp || !password) {
        return undefined;
    }

    return getPasswordRules(password).every((rule) => rule.met)
        ? undefined
        : 'Password requirements are not met.';
}

function toRegisterInput(values: FormValues): RegisterInput {
    return {
        email: values.email.trim(),
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        password: values.password,
    };
}
