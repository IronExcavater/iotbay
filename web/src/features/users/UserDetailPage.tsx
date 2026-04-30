import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { AuditTimeline } from '@features/audit/components/AuditTimeline';
import { useEntityAudit } from '@features/audit/useEntityAudit';
import type { User } from '@features/auth/api';
import { useAuth } from '@features/auth/AuthProvider';
import { usersApi, type ManagedUser } from '@features/users/api';
import { toErrorMessage } from '@shared/services/http';
import { Button } from '@shared/ui/form/Button';
import { Input } from '@shared/ui/form/Input';
import { useToast } from '@shared/ui/toast/ToastProvider';

type DetailUser = ManagedUser | User;

export default function UserDetailPage({
    admin = false,
    me = false,
}: {
    admin?: boolean;
    me?: boolean;
}) {
    const { updateMe, user: currentUser } = useAuth();
    const { userId = '' } = useParams();
    const { showToast } = useToast();
    const [detailUser, setDetailUser] = useState<DetailUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [pageError, setPageError] = useState<string | null>(null);
    const [isEditingMe, setIsEditingMe] = useState(false);
    const [isSavingMe, setIsSavingMe] = useState(false);
    const [editValues, setEditValues] = useState({
        currentPassword: '',
        email: '',
        firstName: '',
        lastName: '',
    });

    const resolvedUserId = me ? currentUser?.id : userId;
    const audit = useEntityAudit({
        entityId: resolvedUserId ?? '',
        entityType: 'user',
        onAfterReplay: () => loadPage(),
        showToast,
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
                setEditValues({
                    currentPassword: '',
                    email: nextUser.email,
                    firstName: nextUser.firstName,
                    lastName: nextUser.lastName,
                });
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

    async function saveMe() {
        if (!currentUser || !me) return;

        setIsSavingMe(true);
        try {
            await updateMe({
                addressLineOne: currentUser.addressLineOne ?? '',
                addressLineTwo: currentUser.addressLineTwo ?? '',
                country: currentUser.country ?? '',
                currentPassword: editValues.currentPassword,
                designation: currentUser.designation ?? '',
                email: editValues.email,
                firstName: editValues.firstName,
                lastName: editValues.lastName,
                permission: currentUser.permission ?? '',
                phoneCountry: currentUser.phoneNumber ? 'AU' : '',
                phoneNumber: currentUser.phoneNumber ?? '',
                postcode: currentUser.postcode ?? '',
                staffId: currentUser.staffId ?? '',
                state: currentUser.state ?? '',
                suburb: currentUser.suburb ?? '',
            });
            setIsEditingMe(false);
            setEditValues((current) => ({ ...current, currentPassword: '' }));
            await loadPage();
            showToast('Account updated');
        } catch (error) {
            showToast(toErrorMessage(error, 'Unable to update account'));
        } finally {
            setIsSavingMe(false);
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

    const canReplay = admin && currentUser?.permission === 'superadmin';

    return (
        <section className="mx-auto grid max-w-4xl gap-8">
            {pageError && <p className="text-sm text-red-700">{pageError}</p>}

            <section className="grid gap-5">
                <div>
                    <p className="text-ui-500 text-sm">
                        {me ? 'Me' : detailUser.userType}
                    </p>
                    <h1 className="text-ui-900 text-4xl font-semibold tracking-tight">
                        {detailUser.firstName} {detailUser.lastName}
                    </h1>
                    <p className="text-ui-500 mt-1 text-sm">
                        {detailUser.email}
                    </p>
                </div>

                {me && (
                    <div>
                        <Button
                            onClick={() => {
                                setIsEditingMe((current) => !current);
                            }}
                            type="button"
                            variant="secondary"
                        >
                            {isEditingMe ? 'Close editor' : 'Edit details'}
                        </Button>
                    </div>
                )}

                {me && isEditingMe && (
                    <form
                        className="grid gap-3 sm:grid-cols-2"
                        onSubmit={(event) => {
                            event.preventDefault();
                            void saveMe();
                        }}
                    >
                        <Input
                            onChange={(event) => {
                                setEditValues((current) => ({
                                    ...current,
                                    firstName: event.target.value,
                                }));
                            }}
                            placeholder="First name"
                            value={editValues.firstName}
                        />
                        <Input
                            onChange={(event) => {
                                setEditValues((current) => ({
                                    ...current,
                                    lastName: event.target.value,
                                }));
                            }}
                            placeholder="Last name"
                            value={editValues.lastName}
                        />
                        <Input
                            className="sm:col-span-2"
                            onChange={(event) => {
                                setEditValues((current) => ({
                                    ...current,
                                    email: event.target.value,
                                }));
                            }}
                            placeholder="Email"
                            type="email"
                            value={editValues.email}
                        />
                        <Input
                            className="sm:col-span-2"
                            onChange={(event) => {
                                setEditValues((current) => ({
                                    ...current,
                                    currentPassword: event.target.value,
                                }));
                            }}
                            placeholder="Current password"
                            type="password"
                            value={editValues.currentPassword}
                        />
                        <Button
                            className="sm:justify-self-start"
                            disabled={isSavingMe}
                            loading={isSavingMe}
                            type="submit"
                            variant="primary"
                        >
                            Save details
                        </Button>
                    </form>
                )}

                <dl className="grid gap-4 sm:grid-cols-2">
                    <DetailItem label="Status" value={detailUser.status} />
                    <DetailItem label="Type" value={detailUser.userType} />
                    {detailUser.permission && (
                        <DetailItem
                            label="Permission"
                            value={detailUser.permission}
                        />
                    )}
                    {detailUser.staffId && (
                        <DetailItem
                            label="Staff ID"
                            value={detailUser.staffId}
                        />
                    )}
                    {detailUser.phoneNumber && (
                        <DetailItem
                            label="Phone"
                            value={detailUser.phoneNumber}
                        />
                    )}
                    {'addressLabel' in detailUser &&
                        detailUser.addressLabel && (
                            <DetailItem
                                label="Address"
                                value={detailUser.addressLabel}
                            />
                        )}
                </dl>
            </section>

            <AuditTimeline
                canReplay={canReplay}
                events={audit.events}
                onRedo={(event) => {
                    void audit.replay(event, 'redo');
                }}
                onUndo={(event) => {
                    void audit.replay(event, 'undo');
                }}
                pendingEventId={audit.pendingEventId}
            />
        </section>
    );
}

function DetailItem({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-ui-500 text-xs font-medium tracking-[0.08em] uppercase">
                {label}
            </dt>
            <dd className="text-ui-900 mt-1 text-sm">{value}</dd>
        </div>
    );
}
