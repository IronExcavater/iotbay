import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { authApi } from '@features/auth/api';
import { useAuth } from '@features/auth/AuthProvider';
import { manageablePermissionOptions } from '@features/users/permissions';
import { downloadHtmlAndNotify } from '@shared/services/download';
import { toErrorMessage } from '@shared/services/http';
import { Button } from '@shared/ui/form/Button';
import { Field } from '@shared/ui/form/Field';
import { Input } from '@shared/ui/form/Input';
import { MenuSelect } from '@shared/ui/form/MenuSelect';
import { OverlayDialog } from '@shared/ui/overlay/OverlayDialog';
import { useToast } from '@shared/ui/toast/ToastProvider';
import {
    collectFieldErrors,
    hasFieldErrors,
    type FieldErrors,
} from '@shared/validation/forms';
import { Email } from '@shared/value-objects/Email';
import { Designation, Permission, StaffId } from '@shared/value-objects/Staff';

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
