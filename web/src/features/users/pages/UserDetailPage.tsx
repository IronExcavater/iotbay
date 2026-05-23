import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type FormEvent,
    type ReactNode,
} from 'react';
import {
    FaArrowLeft,
    FaArrowRightFromBracket,
    FaPenToSquare,
} from 'react-icons/fa6';
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
} from '@features/account/form';
import type { ProfileValues } from '@features/account/types';
import {
    setAddressField,
    type AddressFieldName,
} from '@features/addresses/form';
import { AuditTimeline } from '@features/audit/components/AuditTimeline';
import { useEntityAudit } from '@features/audit/hooks/useEntityAudit';
import { authApi, type SessionInfo, type User } from '@features/auth/api';
import { useAuth } from '@features/auth/AuthProvider';
import {
    formatStoredPhoneNumber,
    validatePhoneNumber,
} from '@features/auth/phone';
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
import { useDocumentTitle } from '@shared/hooks/useDocumentTitle';
import { downloadHtml } from '@shared/services/download';
import { toErrorMessage } from '@shared/services/http';
import { Avatar } from '@shared/ui/Avatar';
import { Button } from '@shared/ui/form/Button';
import { ActionMenu } from '@shared/ui/overlay/ActionMenu';
import { OverlayDialog } from '@shared/ui/overlay/OverlayDialog';
import {
    Table,
    TableActionCell,
    TableHead,
    TableLoadingRow,
    TableMessageRow,
    TableSingleLineCell,
} from '@shared/ui/table/Table';
import { useToast } from '@shared/ui/toast/ToastProvider';
import { DateTimeValue } from '@shared/value-objects/DateTimeValue';
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
    const [userTab, setUserTab] = useState<'activity' | 'details' | 'security'>(
        'details'
    );
    const tabListRef = useRef<HTMLDivElement>(null);
    const tabIndicatorRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const list = tabListRef.current;
        const indicator = tabIndicatorRef.current;
        if (!list || !indicator) return;
        const activeBtn = list.querySelector<HTMLElement>(
            '[aria-selected="true"]'
        );
        if (activeBtn) {
            indicator.style.left = `${activeBtn.offsetLeft}px`;
            indicator.style.width = `${activeBtn.offsetWidth}px`;
        }
    }, [userTab, detailUser]);

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
    const detailName = detailUser
        ? `${detailUser.firstName} ${detailUser.lastName}`
        : '';
    useDocumentTitle(detailName || (me ? 'Account' : 'User'));
    const hasChanges = hasProfileChanges(values, initialValues);
    const emailChanged = Boolean(
        currentUser &&
        values.email.trim().toLowerCase() !== currentUser.email.toLowerCase()
    );
    const currentPasswordHint = emailChanged
        ? 'Changing your email will require verification'
        : 'Only required when changing email';

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
            emailChanged,
            isCustomer,
            isStaff,
        });
        setFieldErrors(nextFieldErrors);
        if (Object.values(nextFieldErrors).some(Boolean)) return;

        setIsSavingMe(true);
        try {
            const result = await updateMe({
                ...toProfileUpdateInput(values, {
                    emailChanged,
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

            const savedUser = {
                ...result,
                profileImageUrl:
                    result.profileImageUrl || values.profileImageUrl || null,
            };
            setDetailUser(savedUser);
            const nextValues = toProfileValues(savedUser);
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
        const emailChanged =
            managedFormValues.email !== editingManagedUser.email;
        const permissionChanged =
            isStaff &&
            managedFormValues.permission !==
                (editingManagedUser.permission ?? 'admin');
        const assessment = assessManagedUserForm(managedFormValues, isStaff, {
            emailChanged,
            permissionChanged,
        });
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
        return (
            <section className="grid gap-8">
                <div className="bg-ui-100 h-4 w-24 animate-pulse rounded" />
                <section className="grid gap-4">
                    <div className="flex items-start gap-4">
                        <div className="bg-ui-100 size-14 shrink-0 animate-pulse rounded-full" />
                        <div className="grid flex-1 gap-2 pt-1">
                            <div className="bg-ui-100 h-7 w-48 animate-pulse rounded" />
                            <div className="bg-ui-100 h-4 w-32 animate-pulse rounded" />
                        </div>
                    </div>
                    <div className="border-ui-200 flex gap-5 border-b pb-0">
                        {['Details', 'Security', 'Activity'].map((label) => (
                            <div
                                key={label}
                                className="bg-ui-100 h-4 w-14 animate-pulse rounded pb-3"
                            />
                        ))}
                    </div>
                </section>
            </section>
        );
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
        <section className="grid gap-8">
            {pageError && <p className="text-sm text-red-700">{pageError}</p>}

            <section className="grid gap-4">
                <div>
                    <Button
                        className="gap-2 focus-visible:ring-0"
                        onClick={() => navigate(admin ? '/admin/users' : '/')}
                        type="button"
                        variant="link"
                    >
                        <FaArrowLeft aria-hidden="true" className="size-3" />
                        Back to {admin ? 'users' : 'home'}
                    </Button>
                </div>

                <div className="flex flex-wrap items-start justify-between gap-4">
                    <Avatar
                        imageUrl={detailUser.profileImageUrl}
                        name={detailName}
                        size="lg"
                    />
                    <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                            <h1 className="text-ui-900 truncate text-3xl font-semibold tracking-tight">
                                {`${detailUser.firstName} ${detailUser.lastName}`}
                            </h1>
                            {!me && detailUser.status !== 'active' && (
                                <span className="shrink-0 rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200">
                                    Deactivated
                                </span>
                            )}
                            {canEditDetails && (
                                <Button
                                    aria-label="Edit details"
                                    className="inline-flex size-8 shrink-0 rounded-full p-0"
                                    onClick={
                                        me || isOwnUser
                                            ? openEditDialog
                                            : openManagedUserDialog
                                    }
                                    type="button"
                                    variant="ghost"
                                >
                                    <FaPenToSquare
                                        aria-hidden="true"
                                        className="size-3.5"
                                    />
                                </Button>
                            )}
                        </div>
                        <p className="text-ui-500 mt-1 truncate text-sm">
                            {isStaff && detailUser.staffId
                                ? `${detailUser.staffId} · ${detailUser.email}`
                                : detailUser.email}
                        </p>
                    </div>
                </div>

                <div
                    aria-label="User sections"
                    className="border-ui-200 relative border-b"
                    role="tablist"
                >
                    <div className="flex gap-1" ref={tabListRef}>
                        <DetailTab
                            active={userTab === 'details'}
                            label="Details"
                            onClick={() => setUserTab('details')}
                        />
                        <DetailTab
                            active={userTab === 'security'}
                            label="Security"
                            onClick={() => setUserTab('security')}
                        />
                        <DetailTab
                            active={userTab === 'activity'}
                            label="Activity"
                            onClick={() => setUserTab('activity')}
                        />
                    </div>
                    <div
                        aria-hidden="true"
                        className="bg-ui-900 absolute bottom-0 h-0.5 transition-[left,width] duration-200"
                        ref={tabIndicatorRef}
                    />
                </div>
            </section>

            {userTab === 'details' && <UserDetailsSummary user={detailUser} />}

            {userTab === 'security' &&
                (me || isOwnUser ? (
                    <AccountSecuritySection readOnly={false} />
                ) : (
                    <UserSecuritySummary
                        canManage={canEditDetails}
                        userId={detailUser.id}
                    />
                ))}

            {userTab === 'activity' && <AuditTimeline events={audit.events} />}

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
                            onProfileImageChange={(value) => {
                                updateValues({ profileImageUrl: value });
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
                            requiresPassword={emailChanged}
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
    const phone = formatStoredPhoneNumber(user.phoneNumber);
    const address = 'addressLabel' in user ? user.addressLabel : null;

    return (
        <section className="grid gap-5 sm:grid-cols-2">
            <DetailPanel title="Email" value={user.email} />
            <DetailPanel title="Phone number" value={phone || 'Not provided'} />
            <DetailPanel title="Address" value={address || 'Not provided'} />
            {user.userType === 'staff' && (
                <DetailPanel
                    title="Staff"
                    value={
                        <span className="inline-flex flex-wrap items-baseline gap-2">
                            <span>{user.designation || 'No designation'}</span>
                            {user.permission && (
                                <span className="text-ui-500 text-sm font-medium capitalize">
                                    {user.permission}
                                </span>
                            )}
                        </span>
                    }
                >
                    {user.staffId && <span>ID: {user.staffId}</span>}
                </DetailPanel>
            )}
        </section>
    );
}

function UserSecuritySummary({
    canManage,
    userId,
}: {
    canManage: boolean;
    userId: string;
}) {
    const { showToast } = useToast();
    const [sessions, setSessions] = useState<SessionInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [revokingSessionId, setRevokingSessionId] = useState<string | null>(
        null
    );

    useEffect(() => {
        const abortController = new AbortController();

        async function loadSessions() {
            setIsLoading(true);
            try {
                const nextSessions = await authApi.listAdminSessions(
                    abortController.signal
                );
                if (!abortController.signal.aborted) {
                    setSessions(
                        nextSessions.filter(
                            (session) => session.userId === userId
                        )
                    );
                    setError(null);
                }
            } catch (caughtError) {
                if (!abortController.signal.aborted) {
                    setError(
                        toErrorMessage(
                            caughtError,
                            'Unable to load active sessions'
                        )
                    );
                }
            } finally {
                if (!abortController.signal.aborted) setIsLoading(false);
            }
        }

        void loadSessions();
        return () => abortController.abort();
    }, [userId]);

    async function revokeSession(session: SessionInfo) {
        if (!canManage) return;
        setRevokingSessionId(session.id);
        try {
            await authApi.revokeAdminSession(session.id);
            setSessions((current) =>
                current.filter((item) => item.id !== session.id)
            );
            showToast('Session revoked');
        } catch (caughtError) {
            showToast(toErrorMessage(caughtError, 'Unable to revoke session'));
        } finally {
            setRevokingSessionId(null);
        }
    }

    const colCount = canManage ? 5 : 4;

    return (
        <section className="grid gap-4">
            <p className="text-ui-500 text-sm">
                Email MFA is managed by the account owner. Active sessions can
                be reviewed here.
            </p>

            <div className="bg-ui-0 border-ui-200 overflow-hidden rounded border">
                <div className="overflow-x-auto">
                    <Table>
                        <colgroup>
                            <col className="w-[34%]" />
                            <col className="w-[24%]" />
                            <col className="w-[24%]" />
                            <col className="w-[12%]" />
                            {canManage && <col className="w-[6%]" />}
                        </colgroup>
                        <TableHead>
                            <tr>
                                <th className="px-5 py-3">Device</th>
                                <th className="px-5 py-3">Last seen</th>
                                <th className="px-5 py-3">IP</th>
                                <th className="px-5 py-3">Trust</th>
                                {canManage && (
                                    <th className="px-2 py-3 text-right">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                )}
                            </tr>
                        </TableHead>
                        <tbody>
                            {isLoading ? (
                                <>
                                    <TableLoadingRow colSpan={colCount} />
                                    <TableLoadingRow colSpan={colCount} />
                                </>
                            ) : error ? (
                                <TableMessageRow
                                    colSpan={colCount}
                                    message={error}
                                    tone="error"
                                />
                            ) : sessions.length === 0 ? (
                                <TableMessageRow
                                    colSpan={colCount}
                                    message="No active sessions."
                                    tone="muted"
                                />
                            ) : (
                                sessions.map((session) => (
                                    <tr
                                        className="border-ui-200 border-t align-top"
                                        key={session.id}
                                    >
                                        <td className="px-5 py-3">
                                            <TableSingleLineCell className="text-ui-900 font-medium">
                                                {session.deviceLabel}
                                            </TableSingleLineCell>
                                        </td>
                                        <td className="px-5 py-3">
                                            <TableSingleLineCell className="text-ui-500">
                                                {DateTimeValue.format(
                                                    session.lastSeenAt,
                                                    'relative'
                                                )}
                                            </TableSingleLineCell>
                                        </td>
                                        <td className="px-5 py-3">
                                            <TableSingleLineCell className="text-ui-500 font-mono text-xs">
                                                {session.latestIpAddress ?? '-'}
                                            </TableSingleLineCell>
                                        </td>
                                        <td className="px-5 py-3">
                                            <TableSingleLineCell className="text-ui-500">
                                                {session.isTrusted
                                                    ? 'Trusted'
                                                    : 'Session'}
                                            </TableSingleLineCell>
                                        </td>
                                        {canManage && (
                                            <TableActionCell>
                                                <ActionMenu
                                                    items={[
                                                        {
                                                            disabled:
                                                                revokingSessionId ===
                                                                session.id,
                                                            icon: FaArrowRightFromBracket,
                                                            label: 'Revoke',
                                                            onSelect: () => {
                                                                void revokeSession(
                                                                    session
                                                                );
                                                            },
                                                        },
                                                    ]}
                                                    label={`Open session actions for ${session.deviceLabel}`}
                                                />
                                            </TableActionCell>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </div>
            </div>
        </section>
    );
}

function DetailTab({
    active,
    label,
    onClick,
}: {
    active: boolean;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            aria-selected={active}
            className={`focus-visible:ring-ui-900 rounded px-3 pt-2 pb-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
                active ? 'text-ui-900' : 'text-ui-500 hover:text-ui-700'
            }`}
            onClick={onClick}
            role="tab"
            type="button"
        >
            {label}
        </button>
    );
}

function DetailPanel({
    children,
    prominent = false,
    title,
    value,
}: {
    children?: ReactNode;
    prominent?: boolean;
    title: string;
    value: ReactNode;
}) {
    return (
        <section className="grid content-start gap-2">
            <span className="text-ui-500 text-xs font-medium tracking-[0.08em] uppercase">
                {title}
            </span>
            <span className="text-ui-900 text-base font-semibold">{value}</span>
            <div
                className={`grid gap-1 text-sm ${prominent ? 'text-ui-700' : 'text-ui-500'}`}
            >
                {children}
            </div>
        </section>
    );
}
