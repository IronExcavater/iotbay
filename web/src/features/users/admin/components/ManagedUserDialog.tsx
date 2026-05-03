import { useState } from 'react';

import type { ManagedUser } from '@features/users/api';
import type {
    ManagedUserFieldErrors,
    ManagedUserFormValues,
} from '@features/users/form';
import { fileToDataUrl, isSupportedImage } from '@shared/services/media';
import { Avatar } from '@shared/ui/Avatar';
import { Button } from '@shared/ui/form/Button';
import { Field } from '@shared/ui/form/Field';
import { Input } from '@shared/ui/form/Input';
import { MenuSelect } from '@shared/ui/form/MenuSelect';
import { PasswordInput } from '@shared/ui/form/PasswordInput';
import { OverlayDialog } from '@shared/ui/overlay/OverlayDialog';
import { Email } from '@shared/value-objects/Email';
import { FirstName, LastName } from '@shared/value-objects/Name';
import { Password } from '@shared/value-objects/Password';
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
    const [showPassword, setShowPassword] = useState(false);

    if (!editingUser || !formValues) {
        return null;
    }

    const emailChanged = formValues.email !== editingUser.email;
    const permissionChanged =
        editingUser.userType === 'staff' &&
        formValues.permission !== (editingUser.permission ?? 'admin');
    const requiresPassword = emailChanged || permissionChanged;

    return (
        <OverlayDialog onClose={onClose} title="Edit user">
            <form className="grid gap-4" onSubmit={onSubmit}>
                <div className="flex flex-wrap items-center gap-4">
                    <Avatar
                        imageUrl={formValues.profileImageUrl}
                        name={`${formValues.firstName} ${formValues.lastName}`}
                        size="lg"
                    />
                    <div className="flex flex-wrap gap-2">
                        <label className="text-ui-700 ring-ui-300 hover:bg-ui-100 relative inline-flex h-9 cursor-pointer items-center rounded px-3 text-sm font-medium ring-1">
                            Change photo
                            <input
                                accept="image/*"
                                className="sr-only"
                                onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    event.target.value = '';
                                    if (!file || !isSupportedImage(file)) {
                                        return;
                                    }
                                    void fileToDataUrl(file).then((value) => {
                                        updateFormValue(
                                            'profileImageUrl',
                                            value
                                        );
                                    });
                                }}
                                type="file"
                            />
                        </label>
                        {formValues.profileImageUrl && (
                            <Button
                                className="text-ui-600 hover:text-ui-900 h-9 px-0 hover:bg-transparent"
                                onClick={() =>
                                    updateFormValue('profileImageUrl', '')
                                }
                                type="button"
                                variant="ghost"
                            >
                                Remove
                            </Button>
                        )}
                    </div>
                </div>

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

                {requiresPassword && (
                    <Field
                        error={fieldErrors.currentPassword}
                        hint="Changing email or permission requires your password"
                        label="Your password"
                        metaPlacement="inline"
                        required
                    >
                        <PasswordInput
                            autoComplete="current-password"
                            hasError={Boolean(fieldErrors.currentPassword)}
                            name="currentPassword"
                            onChange={(event) => {
                                updateFormValue(
                                    'currentPassword',
                                    Password.formatInput(event.target.value)
                                );
                            }}
                            onToggle={() => setShowPassword((v) => !v)}
                            placeholder="Enter your password"
                            showPassword={showPassword}
                            value={formValues.currentPassword}
                        />
                    </Field>
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
