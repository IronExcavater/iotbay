import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { authApi } from '../auth/api';
import {
    assessDesignation,
    assessEmail,
    assessPermission,
    assessStaffId,
    sanitizeDesignation,
    sanitizeEmail,
    sanitizeStaffId,
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
import {
    collectFieldErrors,
    hasFieldErrors,
    type FieldErrors,
} from '../validation/forms';

interface InviteStaffValues {
    designation: string;
    email: string;
    permission: string;
    staffId: string;
}

type InviteStaffFieldName = keyof InviteStaffValues;
type InviteStaffFieldErrors = FieldErrors<InviteStaffFieldName>;

const DEFAULT_VALUES: InviteStaffValues = {
    designation: '',
    email: '',
    permission: 'admin',
    staffId: '',
};

export default function InviteStaffPage() {
    const { showToast } = useToast();
    const [values, setValues] = useState(DEFAULT_VALUES);
    const [fieldErrors, setFieldErrors] = useState<InviteStaffFieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFormError(null);

        const nextFieldErrors = collectFieldErrors<InviteStaffFieldName>({
            designation: assessDesignation(values.designation),
            email: assessEmail(values.email),
            permission: assessPermission(values.permission, true),
            staffId: assessStaffId(values.staffId),
        });

        setFieldErrors(nextFieldErrors);
        if (hasFieldErrors(nextFieldErrors)) {
            return;
        }

        const designation = assessDesignation(values.designation);
        const email = assessEmail(values.email);
        const permission = assessPermission(values.permission, true);
        const staffId = assessStaffId(values.staffId);

        if (
            !designation.value ||
            !email.value ||
            !permission.value ||
            !staffId.value
        ) {
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await authApi.inviteStaff({
                designation: designation.value,
                email: email.value,
                permission: permission.value,
                staffId: staffId.value,
            });
            downloadHtmlAndNotify(result.download, showToast, {
                downloadedMessage: 'Staff invitation downloaded',
                sentMessage: 'Staff invitation sent',
            });
            setValues(DEFAULT_VALUES);
            setFieldErrors({});
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
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                    Invite staff
                </h2>
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

                    <Field
                        error={fieldErrors.email}
                        label="Staff email"
                        required
                    >
                        <input
                            autoComplete="email"
                            className={inputClassName(
                                Boolean(fieldErrors.email)
                            )}
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
                        <Field
                            error={fieldErrors.staffId}
                            label="Staff ID"
                            required
                        >
                            <input
                                className={inputClassName(
                                    Boolean(fieldErrors.staffId)
                                )}
                                maxLength={STAFF_ID_MAX_LENGTH}
                                onChange={(event) => {
                                    setValues((current) => ({
                                        ...current,
                                        staffId: sanitizeStaffId(
                                            event.target.value
                                        ),
                                    }));
                                }}
                                placeholder="STF-001"
                                value={values.staffId}
                            />
                        </Field>

                        <Field
                            error={fieldErrors.designation}
                            label="Position"
                            required
                        >
                            <input
                                className={inputClassName(
                                    Boolean(fieldErrors.designation)
                                )}
                                maxLength={STAFF_DESIGNATION_MAX_LENGTH}
                                onChange={(event) => {
                                    setValues((current) => ({
                                        ...current,
                                        designation: sanitizeDesignation(
                                            event.target.value
                                        ),
                                    }));
                                }}
                                placeholder="Store manager"
                                value={values.designation}
                            />
                        </Field>
                    </div>

                    <Field
                        error={fieldErrors.permission}
                        label="Permission"
                        required
                    >
                        <select
                            className={inputClassName(
                                Boolean(fieldErrors.permission)
                            )}
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
