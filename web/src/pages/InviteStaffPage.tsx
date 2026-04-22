import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { authApi } from '../auth/api';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../components/form/Button';
import { Field } from '../components/form/Field';
import { Input } from '../components/form/Input';
import { MenuSelect } from '../components/form/MenuSelect';
import { OverlayDialog } from '../components/overlay/OverlayDialog';
import { useToast } from '../components/toast/ToastProvider';
import { downloadHtmlAndNotify } from '../services/download';
import { toErrorMessage } from '../services/http';
import { Email } from '../types/Email';
import { Designation, Permission, StaffId } from '../types/Staff';
import { manageablePermissionOptions } from '../users/permissions';
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
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();
    const [values, setValues] = useState(DEFAULT_VALUES);
    const [fieldErrors, setFieldErrors] = useState<InviteStaffFieldErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        // Assess once, derive both validation errors and the payload values.
        const designation = Designation.assess(values.designation);
        const email = Email.assess(values.email);
        const permission = Permission.assess(values.permission, true);
        const staffId = StaffId.assess(values.staffId);

        const nextFieldErrors = collectFieldErrors<InviteStaffFieldName>({
            designation,
            email,
            permission,
            staffId,
        });

        setFieldErrors(nextFieldErrors);
        if (hasFieldErrors(nextFieldErrors)) {
            return;
        }

        // Type-narrowing guard: if there are no field errors the values must be present.
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
            navigate('/admin/users');
        } catch (error) {
            showToast(toErrorMessage(error, 'Unable to invite staff member'));
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <OverlayDialog
            onClose={() => {
                navigate('/admin/users');
            }}
            title="Invite staff"
        >
            <section>
                <form className="grid gap-4" onSubmit={handleSubmit}>
                    <Field
                        error={fieldErrors.email}
                        label="Staff email"
                        required
                    >
                        <Input
                            autoComplete="email"
                            hasError={Boolean(fieldErrors.email)}
                            maxLength={Email.MAX_LENGTH}
                            onChange={(event) => {
                                setValues((current) => ({
                                    ...current,
                                    email: Email.formatInput(
                                        event.target.value
                                    ),
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
                            <Input
                                hasError={Boolean(fieldErrors.staffId)}
                                maxLength={StaffId.MAX_LENGTH}
                                onChange={(event) => {
                                    setValues((current) => ({
                                        ...current,
                                        staffId: StaffId.formatInput(
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
                            <Input
                                hasError={Boolean(fieldErrors.designation)}
                                maxLength={Designation.MAX_LENGTH}
                                onChange={(event) => {
                                    setValues((current) => ({
                                        ...current,
                                        designation: Designation.formatInput(
                                            event.target.value
                                        ),
                                    }));
                                }}
                                placeholder="Store manager"
                                value={values.designation}
                            />
                        </Field>
                    </div>

                    <MenuSelect
                        error={fieldErrors.permission}
                        label="Permission"
                        onChange={(value) => {
                            setValues((current) => ({
                                ...current,
                                permission: value,
                            }));
                        }}
                        options={manageablePermissionOptions(user)}
                        required
                        value={values.permission}
                    />

                    <div className="grid gap-3 pt-2">
                        <Button
                            className="w-full"
                            disabled={isSubmitting}
                            loading={isSubmitting}
                            type="submit"
                            variant="primary"
                        >
                            Send invite
                        </Button>
                    </div>
                </form>
            </section>
        </OverlayDialog>
    );
}
