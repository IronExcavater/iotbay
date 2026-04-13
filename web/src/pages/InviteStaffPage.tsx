import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';

import { authApi } from '../auth/api';
import { useAuth } from '../auth/AuthProvider';
import {
    sanitizeEmail,
    validateEmail,
    EMAIL_MAX_LENGTH,
    STAFF_DESIGNATION_MAX_LENGTH,
    STAFF_ID_MAX_LENGTH,
} from '../auth/validation';
import { Button } from '../components/form/Button';
import { Field } from '../components/form/Field';
import { FormNotice } from '../components/form/FormNotice';
import { inputClassName } from '../components/form/Input';
import { useToast } from '../components/toast/ToastProvider';
import { downloadHtmlAndNotify } from '../services/download';
import { toErrorMessage } from '../services/http';

interface InviteStaffValues {
    designation: string;
    email: string;
    permission: string;
    staffId: string;
}

const DEFAULT_VALUES: InviteStaffValues = {
    designation: '',
    email: '',
    permission: 'admin',
    staffId: '',
};

export default function InviteStaffPage() {
    const { isAuthed, isLoading, logout, user } = useAuth();
    const { showToast } = useToast();
    const [values, setValues] = useState(DEFAULT_VALUES);
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isClearingIneligibleSession, setIsClearingIneligibleSession] =
        useState(false);

    useEffect(() => {
        if (
            isLoading ||
            !isAuthed ||
            !user ||
            (user.userType === 'staff' && user.permission === 'superadmin') ||
            isClearingIneligibleSession
        ) {
            return;
        }

        setIsClearingIneligibleSession(true);
        void logout().finally(() => {
            setIsClearingIneligibleSession(false);
        });
    }, [isAuthed, isClearingIneligibleSession, isLoading, logout, user]);

    if (!isLoading && !isAuthed && !isClearingIneligibleSession) {
        return (
            <Navigate
                replace
                to="/auth?mode=signin&userType=staff&next=/admin/invite-staff"
            />
        );
    }

    if (
        !isLoading &&
        isAuthed &&
        (user?.userType !== 'staff' || user.permission !== 'superadmin')
    ) {
        return (
            <p className="py-8 text-slate-500">
                Redirecting to superadmin sign in
            </p>
        );
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const emailError = validateEmail(values.email);
        if (emailError) {
            setFormError(emailError);
            return;
        }
        if (!values.staffId.trim()) {
            setFormError('Staff ID is required');
            return;
        }
        if (!values.designation.trim()) {
            setFormError('Position is required');
            return;
        }

        setFormError(null);
        setIsSubmitting(true);
        try {
            const result = await authApi.inviteStaff({
                designation: values.designation.trim(),
                email: values.email.trim(),
                permission: values.permission,
                staffId: values.staffId.trim().toUpperCase(),
            });
            downloadHtmlAndNotify(result.download, showToast, {
                downloadedMessage: 'Staff invitation downloaded',
                sentMessage: 'Staff invitation sent',
            });
            setValues(DEFAULT_VALUES);
        } catch (error) {
            setFormError(
                toErrorMessage(error, 'Unable to invite staff member')
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className="mx-auto grid max-w-2xl gap-6">
            <header className="grid gap-2">
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    Invite staff
                </h1>
                <p className="text-sm text-slate-600">
                    Send a staff registration link that lets the invited team
                    member finish creating their account.
                </p>
            </header>

            <section className="rounded border border-slate-200 bg-white p-5">
                <form className="grid gap-4" onSubmit={handleSubmit}>
                    {formError ? (
                        <FormNotice tone="error">{formError}</FormNotice>
                    ) : null}

                    <Field label="Staff email" required>
                        <input
                            autoComplete="email"
                            className={inputClassName(Boolean(formError))}
                            maxLength={EMAIL_MAX_LENGTH}
                            onChange={(event) => {
                                setValues((current) => ({
                                    ...current,
                                    email: sanitizeEmail(event.target.value),
                                }));
                            }}
                            placeholder="staff.member@iotbay.com"
                            value={values.email}
                        />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Staff ID" required>
                            <input
                                className={inputClassName(Boolean(formError))}
                                maxLength={STAFF_ID_MAX_LENGTH}
                                onChange={(event) => {
                                    setValues((current) => ({
                                        ...current,
                                        staffId:
                                            event.target.value.toUpperCase(),
                                    }));
                                }}
                                placeholder="STF-001"
                                value={values.staffId}
                            />
                        </Field>

                        <Field label="Position" required>
                            <input
                                className={inputClassName(Boolean(formError))}
                                maxLength={STAFF_DESIGNATION_MAX_LENGTH}
                                onChange={(event) => {
                                    setValues((current) => ({
                                        ...current,
                                        designation: event.target.value,
                                    }));
                                }}
                                placeholder="Store manager"
                                value={values.designation}
                            />
                        </Field>
                    </div>

                    <Field label="Permission" required>
                        <select
                            className={inputClassName(false)}
                            onChange={(event) => {
                                setValues((current) => ({
                                    ...current,
                                    permission: event.target.value,
                                }));
                            }}
                            value={values.permission}
                        >
                            <option value="admin">Admin</option>
                            <option value="superadmin">Superadmin</option>
                        </select>
                    </Field>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                        <Button
                            disabled={isSubmitting}
                            loading={isSubmitting}
                            type="submit"
                            variant="primary"
                        >
                            Send invite
                        </Button>
                        <Link to="/admin/users">
                            <Button type="button" variant="secondary">
                                Back to users
                            </Button>
                        </Link>
                    </div>
                </form>
            </section>
        </section>
    );
}
