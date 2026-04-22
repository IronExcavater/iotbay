import type { ManagedUser } from '@features/users/api';
import type {
    ManagedUserFieldErrors,
    ManagedUserFormValues,
} from '@features/users/form';
import { Button } from '@shared/ui/form/Button';
import { Field } from '@shared/ui/form/Field';
import { Input } from '@shared/ui/form/Input';
import { MenuSelect } from '@shared/ui/form/MenuSelect';
import { OverlayDialog } from '@shared/ui/overlay/OverlayDialog';
import { Email } from '@shared/value-objects/Email';
import { FirstName, LastName } from '@shared/value-objects/Name';
import { Designation, StaffId } from '@shared/value-objects/Staff';

interface PermissionOption {
    description: string;
    label: string;
    value: string;
}

interface ManagedUserDialogProps {
    editingUser: ManagedUser | null;
    fieldErrors: ManagedUserFieldErrors;
    formValues: ManagedUserFormValues | null;
    isSubmitting: boolean;
    onClose: () => void;
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
    permissionOptions: PermissionOption[];
    updateFormValue: (name: keyof ManagedUserFormValues, value: string) => void;
}

export function ManagedUserDialog({
    editingUser,
    fieldErrors,
    formValues,
    isSubmitting,
    onClose,
    onSubmit,
    permissionOptions,
    updateFormValue,
}: ManagedUserDialogProps) {
    if (!editingUser || !formValues) {
        return null;
    }

    return (
        <OverlayDialog onClose={onClose} title="Edit user">
            <form className="grid gap-4" onSubmit={onSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                        error={fieldErrors.firstName}
                        label="First name"
                        required
                    >
                        <Input
                            hasError={Boolean(fieldErrors.firstName)}
                            maxLength={FirstName.MAX_LENGTH}
                            onChange={(event) =>
                                updateFormValue('firstName', event.target.value)
                            }
                            value={formValues.firstName}
                        />
                    </Field>

                    <Field
                        error={fieldErrors.lastName}
                        label="Last name"
                        required
                    >
                        <Input
                            hasError={Boolean(fieldErrors.lastName)}
                            maxLength={LastName.MAX_LENGTH}
                            onChange={(event) =>
                                updateFormValue('lastName', event.target.value)
                            }
                            value={formValues.lastName}
                        />
                    </Field>
                </div>

                <Field error={fieldErrors.email} label="Email" required>
                    <Input
                        hasError={Boolean(fieldErrors.email)}
                        maxLength={Email.MAX_LENGTH}
                        onChange={(event) =>
                            updateFormValue('email', event.target.value)
                        }
                        value={formValues.email}
                    />
                </Field>

                {editingUser.userType === 'staff' && (
                    <>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field error={fieldErrors.staffId} label="Staff ID">
                                <Input
                                    hasError={Boolean(fieldErrors.staffId)}
                                    maxLength={StaffId.MAX_LENGTH}
                                    onChange={(event) =>
                                        updateFormValue(
                                            'staffId',
                                            event.target.value
                                        )
                                    }
                                    value={formValues.staffId}
                                />
                            </Field>

                            <Field
                                error={fieldErrors.designation}
                                label="Position"
                            >
                                <Input
                                    hasError={Boolean(fieldErrors.designation)}
                                    maxLength={Designation.MAX_LENGTH}
                                    onChange={(event) =>
                                        updateFormValue(
                                            'designation',
                                            event.target.value
                                        )
                                    }
                                    value={formValues.designation}
                                />
                            </Field>
                        </div>

                        <MenuSelect
                            error={fieldErrors.permission}
                            label="Permission"
                            onChange={(value) => {
                                updateFormValue('permission', value);
                            }}
                            options={permissionOptions}
                            required
                            value={formValues.permission}
                        />
                    </>
                )}

                <div className="grid gap-3 pt-2">
                    <Button
                        className="w-full"
                        disabled={isSubmitting}
                        loading={isSubmitting}
                        type="submit"
                        variant="primary"
                    >
                        Save changes
                    </Button>
                </div>
            </form>
        </OverlayDialog>
    );
}
