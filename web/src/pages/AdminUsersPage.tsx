import { useState, type FormEvent } from 'react';
import { Link, Outlet } from 'react-router-dom';

import { ManagedUserDialog } from '../admin/users/components/ManagedUserDialog';
import { UsersTable } from '../admin/users/components/UsersTable';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../components/form/Button';
import { useManagedUsers } from '../hooks/useManagedUsers';
import { useSearchFilter } from '../hooks/useSearchFilter';
import { toErrorMessage } from '../services/http';
import { usersApi, type ManagedUser } from '../users/api';
import {
    assessManagedUserForm,
    formatManagedUserField,
    toManagedUserErrorState,
    toManagedUserFormValues,
    type ManagedUserFieldErrors,
    type ManagedUserFormValues,
} from '../users/form';
import {
    manageablePermissionOptions,
    canChangeManagedUserStatus,
    canEditManagedUser,
} from '../users/permissions';

export default function AdminUsersPage() {
    const { user } = useAuth();
    const { isLoadingUsers, loadUsers, replaceUser, users, usersError } =
        useManagedUsers();
    const [search, setSearch] = useState('');
    const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
    const [formValues, setFormValues] = useState<ManagedUserFormValues | null>(
        null
    );
    const [fieldErrors, setFieldErrors] = useState<ManagedUserFieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    const filteredUsers = useSearchFilter(users, search, (managedUser) => [
        managedUser.email,
        managedUser.firstName,
        managedUser.lastName,
        `${managedUser.firstName} ${managedUser.lastName}`,
        managedUser.userType,
        managedUser.status,
        managedUser.permission ?? '',
        managedUser.designation ?? '',
        managedUser.staffId ?? '',
        managedUser.phoneNumber ?? '',
        managedUser.addressLabel ?? '',
        managedUser.country ?? '',
    ]);

    function closeEditDialog() {
        setEditingUser(null);
        setFormValues(null);
        setFieldErrors({});
        setFormError(null);
    }

    // Convenience wrapper so individual field onChange handlers are one-liners.
    function updateFormValues(
        name: keyof ManagedUserFormValues,
        value: string
    ) {
        setFormValues((current) =>
            current
                ? { ...current, [name]: formatManagedUserField(name, value) }
                : null
        );
    }

    function handleEdit(userToEdit: ManagedUser) {
        setEditingUser(userToEdit);
        setFormValues(toManagedUserFormValues(userToEdit));
        setFieldErrors({});
        setFormError(null);
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!editingUser || !formValues) {
            return;
        }

        const isStaff = editingUser.userType === 'staff';
        const assessment = assessManagedUserForm(formValues, isStaff);
        setFieldErrors(assessment.fieldErrors);
        setFormError(null);

        if (!assessment.payload) {
            return;
        }

        setIsSubmitting(true);
        try {
            const updatedUser = await usersApi.update(
                editingUser.id,
                assessment.payload
            );
            replaceUser(updatedUser);
            closeEditDialog();
        } catch (error) {
            const nextState = toManagedUserErrorState(error);
            setFieldErrors(nextState.fieldErrors);
            setFormError(nextState.formError);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleStatusChange(
        targetUser: ManagedUser,
        status: 'active' | 'disabled'
    ) {
        setActionError(null);

        try {
            const updatedUser = await usersApi.updateStatus(targetUser.id, {
                status,
            });
            replaceUser(updatedUser);
        } catch (error) {
            setActionError(
                toErrorMessage(error, 'Unable to update user status')
            );
        }
    }

    return (
        <>
            <div className="grid gap-4">
                <div className="flex justify-end">
                    <Link to="/admin/users/invite-staff">
                        <Button type="button" variant="primary">
                            Invite staff
                        </Button>
                    </Link>
                </div>

                <UsersTable
                    actionError={actionError}
                    canChangeStatus={(managedUser) =>
                        canChangeManagedUserStatus(user, managedUser)
                    }
                    canEdit={(managedUser) =>
                        canEditManagedUser(user, managedUser)
                    }
                    filteredUsers={filteredUsers}
                    isLoadingUsers={isLoadingUsers}
                    onEdit={handleEdit}
                    onRefresh={() => {
                        void loadUsers();
                    }}
                    onSearchChange={setSearch}
                    onStatusChange={(managedUser, status) => {
                        void handleStatusChange(managedUser, status);
                    }}
                    search={search}
                    usersError={usersError}
                />
            </div>

            <ManagedUserDialog
                editingUser={editingUser}
                fieldErrors={fieldErrors}
                formError={formError}
                formValues={formValues}
                isSubmitting={isSubmitting}
                onClose={closeEditDialog}
                onSubmit={handleSubmit}
                permissionOptions={manageablePermissionOptions(user)}
                updateFormValue={updateFormValues}
            />

            <Outlet />
        </>
    );
}
