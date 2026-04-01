import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';
import { EMAIL_MAX_LENGTH, NAME_MAX_LENGTH } from '../auth/limits';
import { BackendError } from '../services/http';

interface ProfileValues {
    email: string;
    firstName: string;
    lastName: string;
}

export default function AccountPage() {
    const { isAuthenticated, isLoading, updateMe, user } = useAuth();
    const [values, setValues] = useState<ProfileValues>({
        email: '',
        firstName: '',
        lastName: '',
    });
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!user) {
            return;
        }

        setValues({
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
        });
    }, [user]);

    if (!isLoading && !isAuthenticated) {
        return <Navigate replace to="/auth?mode=signin" />;
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setSuccess(null);

        if (!values.firstName.trim()) {
            setError('First name is required');
            return;
        }
        if (!values.lastName.trim()) {
            setError('Last name is required');
            return;
        }
        if (!values.email.trim()) {
            setError('Email is required');
            return;
        }

        setIsSubmitting(true);
        try {
            await updateMe({
                email: values.email.trim(),
                firstName: values.firstName.trim(),
                lastName: values.lastName.trim(),
            });
            setSuccess('Account updated');
        } catch (caughtError) {
            setError(toAccountError(caughtError));
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className="mx-auto grid max-w-3xl gap-6">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Account
            </h1>

            <section className="rounded border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-semibold">Edit details</h2>

                <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
                    {error ? (
                        <p className="text-sm text-red-700">{error}</p>
                    ) : null}
                    {success ? (
                        <p className="text-sm text-emerald-700">{success}</p>
                    ) : null}

                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="grid gap-1 text-sm">
                            <span>First name</span>
                            <input
                                className="rounded border border-slate-300 px-3 py-2"
                                maxLength={NAME_MAX_LENGTH}
                                onChange={(event) => {
                                    setValues((current) => ({
                                        ...current,
                                        firstName: event.target.value,
                                    }));
                                    setError(null);
                                    setSuccess(null);
                                }}
                                value={values.firstName}
                            />
                        </label>

                        <label className="grid gap-1 text-sm">
                            <span>Last name</span>
                            <input
                                className="rounded border border-slate-300 px-3 py-2"
                                maxLength={NAME_MAX_LENGTH}
                                onChange={(event) => {
                                    setValues((current) => ({
                                        ...current,
                                        lastName: event.target.value,
                                    }));
                                    setError(null);
                                    setSuccess(null);
                                }}
                                value={values.lastName}
                            />
                        </label>
                    </div>

                    <label className="grid gap-1 text-sm">
                        <span>Email</span>
                        <input
                            className="rounded border border-slate-300 px-3 py-2"
                            maxLength={EMAIL_MAX_LENGTH}
                            onChange={(event) => {
                                setValues((current) => ({
                                    ...current,
                                    email: event.target.value,
                                }));
                                setError(null);
                                setSuccess(null);
                            }}
                            type="email"
                            value={values.email}
                        />
                    </label>

                    <button
                        className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                        disabled={isSubmitting}
                        type="submit"
                    >
                        {isSubmitting ? 'Saving...' : 'Save changes'}
                    </button>
                </form>
            </section>

            {user ? (
                <div className="overflow-hidden rounded border border-slate-200 bg-white">
                    <table className="min-w-full text-left text-sm">
                        <tbody>
                            {[
                                ['User type', user.userType],
                                ['Status', user.status],
                            ].map(([label, value]) => (
                                <tr
                                    className="border-t border-slate-200 first:border-t-0"
                                    key={label}
                                >
                                    <th className="w-48 bg-slate-50 px-4 py-3 font-medium text-slate-600">
                                        {label}
                                    </th>
                                    <td className="px-4 py-3">{value}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-slate-500">Loading account.</p>
            )}
        </section>
    );
}

function toAccountError(error: unknown) {
    if (!(error instanceof BackendError)) {
        return 'Something went wrong';
    }

    if (error.code === 'EMAIL_EXISTS') {
        return 'Email already exists';
    }

    return error.message;
}
