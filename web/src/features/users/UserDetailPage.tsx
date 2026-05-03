import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { FaPenToSquare } from 'react-icons/fa6';
import { useNavigate, useParams } from 'react-router-dom';

import {
    AccountActionsSection,
    AccountContactSection,
    AccountPersonalSection,
    AccountStaffSection,
} from '@features/account/components/AccountFormSections';
import { AccountSecuritySection } from '@features/account/components/AccountSecuritySection';
import {
    DEFAULT_PROFILE_VALUES,
    hasProfileChanges,
    toAccountError,
    toProfileUpdateInput,
    toProfileValues,
    validateProfileForm,
    type ProfileFieldErrors,
} from '@features/account/profileForm';
import type { ProfileValues } from '@features/account/types';
import {
    setAddressField,
    type AddressFieldName,
} from '@features/addresses/form';
import { AuditTimeline } from '@features/audit/components/AuditTimeline';
import { useEntityAudit } from '@features/audit/useEntityAudit';
import type { User } from '@features/auth/api';
import { useAuth } from '@features/auth/AuthProvider';
import { validatePhoneNumber } from '@features/auth/phone';
import { buildVerifyEmailPath } from '@features/auth/redirects';
import { ManagedUserDialog } from '@features/users/admin/components/ManagedUserDialog';
import { usersApi, type ManagedUser } from '@features/users/api';
import {
    assessManagedUserForm,
    formatManagedUserField,
    toManagedUserErrorState,
    toManagedUserFormValues,
    type ManagedUserFieldErrors,
    type ManagedUserFormValues,
} from '@features/users/form';
import {
    canEditManagedUser,
    manageablePermissionOptions,
} from '@features/users/permissions';
import { downloadHtml } from '@shared/services/download';
import { toErrorMessage } from '@shared/services/http';
import { Button } from '@shared/ui/form/Button';
import { OverlayDialog } from '@shared/ui/overlay/OverlayDialog';
import { useToast } from '@shared/ui/toast/ToastProvider';
import { Email } from '@shared/value-objects/Email';
import { FirstName, LastName } from '@shared/value-objects/Name';
import { Designation, StaffId } from '@shared/value-objects/Staff';

type DetailUser = ManagedUser | User;

export default function UserDetailPage({
    admin = false,
    me = false,
}: {
    admin?: boolean;
    me?: boolean;
}) {
    const navigate = useNavigate();
    const { updateMe, user: currentUser } = useAuth();
    const { userId = '' } = useParams();
    const { showToast } = useToast();
    const [detailUser, setDetailUser] = useState<DetailUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [pageError, setPageError] = useState<string | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isSavingMe, setIsSavingMe] = useState(false);
    const [editingManagedUser, setEditingManagedUser] =
        useState<ManagedUser | null>(null);
    const [managedFormValues, setManagedFormValues] =
        useState<ManagedUserFormValues | null>(null);
    const [managedFieldErrors, setManagedFieldErrors] =
        useState<ManagedUserFieldErrors>({});
    const [isSavingManagedUser, setIsSavingManagedUser] = useState(false);
    const [values, setValues] = useState<ProfileValues>(DEFAULT_PROFILE_VALUES);
    const [initialValues, setInitialValues] = useState<ProfileValues>(
        DEFAULT_PROFILE_VALUES
    );
    const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [accountTab, setAccountTab] = useState<'details' | 'security'>(
        'details'
    );

    const resolvedUserId = me ? currentUser?.id : userId;
    const audit = useEntityAudit({
        entityId: resolvedUserId ?? '',
        entityType: 'user',
    });

    async function loadPage(signal?: AbortSignal) {
        if (!resolvedUserId) return;

        setIsLoading(true);
        try {
            const [nextUser] = await Promise.all([
                me && currentUser
                    ? Promise.resolve(currentUser)
                    : usersApi.get(resolvedUserId, signal),
                audit.loadEvents(signal).then(() => null),
            ]);
            if (!signal?.aborted) {
                setDetailUser(nextUser);
                const nextValues = toProfileValues(nextUser);
                setValues(nextValues);
                setInitialValues(nextValues);
                setPageError(null);
            }
        } catch (error) {
            if (!signal?.aborted) {
                setPageError(toErrorMessage(error, 'Unable to load user'));
            }
        } finally {
            if (!signal?.aborted) setIsLoading(false);
        }
    }

    useEffect(() => {
        const abortController = new AbortController();
        void loadPage(abortController.signal);
        return () => abortController.abort();
    }, [resolvedUserId]);

    const isCustomer = detailUser?.userType === 'customer';
    const isStaff = detailUser?.userType === 'staff';
    const hasChanges = hasProfileChanges(values, initialValues);
    const emailChanged = Boolean(
        currentUser &&
        values.email.trim().toLowerCase() !== currentUser.email.toLowerCase()
    );
    const currentPasswordHint = emailChanged
        ? 'Changing your email will require verification'
        : 'Required to save changes';

    function setFieldError(
        name: keyof ProfileFieldErrors,
        message?: string | null
    ) {
        setFieldErrors((current) => ({
            ...current,
            [name]: message || undefined,
        }));
    }

    function updateValues(patch: Partial<ProfileValues>) {
        setValues((current) => ({
            ...current,
            ...patch,
        }));
    }

    function handleAddressFieldChange(name: AddressFieldName, value: string) {
        setValues((current) => setAddressField(current, name, value));
    }

    function handlePhoneBlur() {
        setFieldError(
            'phoneNumber',
            values.phoneNumber.trim()
                ? validatePhoneNumber(values.phoneNumber, values.phoneCountry)
                : null
        );
    }

    function openEditDialog() {
        setValues(initialValues);
        setFieldErrors({});
        setShowCurrentPassword(false);
        setIsEditDialogOpen(true);
    }

    function closeEditDialog() {
        setValues(initialValues);
        setFieldErrors({});
        setIsEditDialogOpen(false);
    }

    function openManagedUserDialog() {
        if (!detailUser || !admin) return;
        const managedUser = detailUser as ManagedUser;
        setEditingManagedUser(managedUser);
        setManagedFormValues(toManagedUserFormValues(managedUser));
        setManagedFieldErrors({});
    }

    function closeManagedUserDialog() {
        setEditingManagedUser(null);
        setManagedFormValues(null);
        setManagedFieldErrors({});
    }

    function updateManagedFormValue(
        name: keyof ManagedUserFormValues,
        value: string
    ) {
        setManagedFormValues((current) =>
            current
                ? { ...current, [name]: formatManagedUserField(name, value) }
                : null
        );
    }

    async function saveMe(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const isOwnUser = Boolean(
            currentUser && detailUser?.id === currentUser.id
        );
        if (!currentUser || (!me && !isOwnUser)) return;
        if (!hasChanges) return;

        const nextFieldErrors = validateProfileForm(values, {
            hasChanges,
            isCustomer,
            isStaff,
        });
        setFieldErrors(nextFieldErrors);
        if (Object.values(nextFieldErrors).some(Boolean)) return;

        setIsSavingMe(true);
        try {
            const result = await updateMe({
                ...toProfileUpdateInput(values, {
                    hasChanges,
                    isCustomer,
                    isStaff,
                }),
            });

            setFieldErrors({});

            if ('verification' in result) {
                downloadHtml(result.download);
                navigate(
                    buildVerifyEmailPath({
                        context: 'account',
                        downloaded: Boolean(result.download),
                        email: values.email.trim(),
                        nextPath: '/account',
                        userType: isStaff ? 'staff' : undefined,
                    })
                );
                return;
            }

            const nextValues = toProfileValues(result);
            setDetailUser(result);
            setValues(nextValues);
            setInitialValues(nextValues);
            setIsEditDialogOpen(false);
            showToast('Account updated');
        } catch (error) {
            const nextErrorState = toAccountError(error);
            setFieldErrors(nextErrorState.fieldErrors);
            showToast(nextErrorState.formError ?? 'Unable to update account');
        } finally {
            setIsSavingMe(false);
        }
    }

    async function saveManagedUser(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!editingManagedUser || !managedFormValues) return;

        const isStaff = editingManagedUser.userType === 'staff';
        const assessment = assessManagedUserForm(managedFormValues, isStaff);
        setManagedFieldErrors(assessment.fieldErrors);

        if (!assessment.payload) return;

        setIsSavingManagedUser(true);
        try {
            const updatedUser = await usersApi.update(
                editingManagedUser.id,
                assessment.payload
            );
            setDetailUser(updatedUser);
            closeManagedUserDialog();
            void audit.loadEvents();
            showToast('User updated');
        } catch (error) {
            const nextState = toManagedUserErrorState(error);
            setManagedFieldErrors(nextState.fieldErrors);
            if (nextState.formError) showToast(nextState.formError);
        } finally {
            setIsSavingManagedUser(false);
        }
    }

    if (isLoading) {
        return <p className="text-ui-500 text-sm">Loading user...</p>;
    }

    if (!detailUser || !resolvedUserId) {
        return (
            <p className="text-sm text-red-700">
                {pageError ?? 'User not found'}
            </p>
        );
    }

    const isOwnUser = Boolean(currentUser && detailUser.id === currentUser.id);
    const canEditDetails =
        me ||
        (admin &&
            (isOwnUser ||
                canEditManagedUser(currentUser, detailUser as ManagedUser)));

    return (
        <section className="mx-auto grid max-w-4xl gap-8">
            {pageError && <p className="text-sm text-red-700">{pageError}</p>}

            <section className="grid gap-4">
                <div>
                    <Button
                        className="h-auto px-0"
                        onClick={() => navigate(admin ? '/admin/users' : '/')}
                        type="button"
                        variant="ghost"
                    >
                        Back to {admin ? 'users' : 'home'}
                    </Button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="min-w-0">
                        <h1 className="text-ui-900 text-4xl font-semibold tracking-tight">
                            {me
                                ? 'Account'
                                : `${detailUser.firstName} ${detailUser.lastName}`}
                        </h1>
                        <p className="text-ui-500 mt-1 truncate text-sm">
                            {me
                                ? `${detailUser.firstName} ${detailUser.lastName} - ${detailUser.email}`
                                : detailUser.email}
                        </p>
                    </div>

                    {canEditDetails && (!me || accountTab === 'details') && (
                        <Button
                            aria-label="Edit details"
                            className="inline-flex size-9 rounded-full p-0"
                            onClick={
                                me || isOwnUser
                                    ? openEditDialog
                                    : openManagedUserDialog
                            }
                            type="button"
                            variant="secondary"
                        >
                            <FaPenToSquare
                                aria-hidden="true"
                                className="size-3.5"
                            />
                        </Button>
                    )}
                </div>

                {me && (
                    <div
                        aria-label="Account sections"
                        className="border-ui-200 flex gap-5 border-b"
                        role="tablist"
                    >
                        <button
                            aria-selected={accountTab === 'details'}
                            className={`border-b-2 px-0 pb-2 text-sm font-medium ${
                                accountTab === 'details'
                                    ? 'border-ui-900 text-ui-900'
                                    : 'text-ui-500 hover:text-ui-900 border-transparent'
                            }`}
                            onClick={() => setAccountTab('details')}
                            role="tab"
                            type="button"
                        >
                            Details
                        </button>
                        <button
                            aria-selected={accountTab === 'security'}
                            className={`border-b-2 px-0 pb-2 text-sm font-medium ${
                                accountTab === 'security'
                                    ? 'border-ui-900 text-ui-900'
                                    : 'text-ui-500 hover:text-ui-900 border-transparent'
                            }`}
                            onClick={() => setAccountTab('security')}
                            role="tab"
                            type="button"
                        >
                            Security
                        </button>
                    </div>
                )}
            </section>

            {(!me || accountTab === 'details') && (
                <>
                    <UserDetailsSummary user={detailUser} />

                    <AuditTimeline events={audit.events} />
                </>
            )}

            {me && accountTab === 'security' && <AccountSecuritySection />}

            {isEditDialogOpen && (
                <OverlayDialog
                    className="max-w-2xl"
                    onClose={closeEditDialog}
                    title="Edit account details"
                >
                    <form
                        className="grid gap-6"
                        onSubmit={(event) => void saveMe(event)}
                    >
                        <AccountPersonalSection
                            fieldErrors={fieldErrors}
                            onEmailBlur={() => {
                                setFieldError(
                                    'email',
                                    Email.validate(values.email)
                                );
                            }}
                            onEmailChange={(value) => {
                                updateValues({
                                    email: Email.formatInput(value),
                                });
                            }}
                            onFirstNameBlur={() => {
                                setFieldError(
                                    'firstName',
                                    FirstName.validateOnBlur(values.firstName)
                                );
                            }}
                            onFirstNameChange={(value) => {
                                updateValues({
                                    firstName: FirstName.formatInput(value),
                                });
                            }}
                            onLastNameBlur={() => {
                                setFieldError(
                                    'lastName',
                                    LastName.validateOnBlur(values.lastName)
                                );
                            }}
                            onLastNameChange={(value) => {
                                updateValues({
                                    lastName: LastName.formatInput(value),
                                });
                            }}
                            values={values}
                        />

                        {isCustomer && (
                            <AccountContactSection
                                errors={fieldErrors}
                                onAddressFieldChange={handleAddressFieldChange}
                                onPhoneBlur={handlePhoneBlur}
                                onPhoneCountryChange={(phoneCountry) => {
                                    updateValues({ phoneCountry });
                                }}
                                onPhoneNumberChange={(phoneNumber) => {
                                    updateValues({ phoneNumber });
                                }}
                                values={values}
                            />
                        )}

                        {isStaff && (
                            <AccountStaffSection
                                errors={fieldErrors}
                                onDesignationChange={(value) => {
                                    updateValues({
                                        designation:
                                            Designation.formatInput(value),
                                    });
                                }}
                                onStaffIdChange={(value) => {
                                    updateValues({
                                        staffId: StaffId.formatInput(value),
                                    });
                                }}
                                values={values}
                            />
                        )}

                        <AccountActionsSection
                            currentPasswordHint={currentPasswordHint}
                            error={fieldErrors.currentPassword}
                            hasChanges={hasChanges}
                            isSubmitting={isSavingMe}
                            onBlur={() => {
                                setFieldError(
                                    'currentPassword',
                                    values.currentPassword.trim()
                                        ? null
                                        : 'Current password is required'
                                );
                            }}
                            onChange={(value) => {
                                updateValues({ currentPassword: value });
                            }}
                            onSubmitToggle={() => {
                                setShowCurrentPassword((current) => !current);
                            }}
                            showPassword={showCurrentPassword}
                            value={values.currentPassword}
                        />
                    </form>
                </OverlayDialog>
            )}

            <ManagedUserDialog
                editingUser={editingManagedUser}
                fieldErrors={managedFieldErrors}
                formValues={managedFormValues}
                isSubmitting={isSavingManagedUser}
                onClose={closeManagedUserDialog}
                onSubmit={saveManagedUser}
                permissionOptions={manageablePermissionOptions(currentUser)}
                updateFormValue={updateManagedFormValue}
            />
        </section>
    );
}

function UserDetailsSummary({ user }: { user: DetailUser }) {
    const accountState =
        user.status === 'active' ? 'Active account' : 'Disabled account';
    const role =
        user.userType === 'staff'
            ? user.permission
                ? `${capitalize(user.permission)} staff`
                : 'Staff account'
            : 'Customer account';
    const contactItems = [
        user.email,
        user.phoneNumber,
        'addressLabel' in user ? user.addressLabel : null,
    ].filter((item): item is string => Boolean(item));

    return (
        <section className="grid gap-5 sm:grid-cols-3">
            <DetailPanel title="Account" value={accountState}>
                <span>{role}</span>
            </DetailPanel>

            <DetailPanel title="Contact" value={contactItems[0] ?? 'No email'}>
                {contactItems.slice(1).map((item) => (
                    <span key={item}>{item}</span>
                ))}
                {contactItems.length === 1 && (
                    <span>No other contact details</span>
                )}
            </DetailPanel>

            <DetailPanel
                title={user.userType === 'staff' ? 'Staff access' : 'Customer'}
                value={
                    user.userType === 'staff'
                        ? user.designation || 'Staff member'
                        : 'Shopping account'
                }
            >
                {user.staffId && <span>Staff ID {user.staffId}</span>}
                {user.userType === 'customer' && (
                    <span>Catalogue and orders access</span>
                )}
            </DetailPanel>
        </section>
    );
}

function DetailPanel({
    children,
    title,
    value,
}: {
    children: ReactNode;
    title: string;
    value: string;
}) {
    return (
        <section className="grid content-start gap-2">
            <span className="text-ui-500 text-xs font-medium tracking-[0.08em] uppercase">
                {title}
            </span>
            <span className="text-ui-900 text-base font-semibold">{value}</span>
            <div className="text-ui-500 grid gap-1 text-sm">{children}</div>
        </section>
    );
}

function capitalize(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}
