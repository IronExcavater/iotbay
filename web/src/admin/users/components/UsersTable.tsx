import {
    FaArrowsRotate,
    FaBan,
    FaPenToSquare,
    FaPowerOff,
} from 'react-icons/fa6';

import { Button } from '../../../components/form/Button';
import { FormNotice } from '../../../components/form/FormNotice';
import { SearchInput } from '../../../components/form/SearchInput';
import { ActionMenu } from '../../../components/overlay/ActionMenu';
import {
    Table,
    TableActionCell,
    TableHead,
    TableLoadingRow,
    TableMessageRow,
    TableSingleLineCell,
    TableStackCell,
} from '../../../components/table/Table';
import type { ManagedUser } from '../../../users/api';

interface UsersTableProps {
    actionError: string | null;
    canChangeStatus: (user: ManagedUser) => boolean;
    canEdit: (user: ManagedUser) => boolean;
    filteredUsers: ManagedUser[];
    isLoadingUsers: boolean;
    onEdit: (user: ManagedUser) => void;
    onRefresh: () => void;
    onSearchChange: (value: string) => void;
    onStatusChange: (user: ManagedUser, status: 'active' | 'disabled') => void;
    search: string;
    usersError: string | null;
}

export function UsersTable({
    actionError,
    canChangeStatus,
    canEdit,
    filteredUsers,
    isLoadingUsers,
    onEdit,
    onRefresh,
    onSearchChange,
    onStatusChange,
    search,
    usersError,
}: UsersTableProps) {
    return (
        <section className="bg-surface-0 overflow-hidden rounded border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                        Users
                    </h2>

                    <Button
                        aria-label="Refresh users"
                        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full p-0"
                        onClick={onRefresh}
                        title="Refresh users"
                        type="button"
                        variant="ghost"
                    >
                        <FaArrowsRotate
                            aria-hidden="true"
                            className="size-3.5"
                        />
                    </Button>
                </div>

                <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
                    <SearchInput
                        className="max-w-full sm:w-72 md:w-80"
                        onChange={onSearchChange}
                        placeholder="Search users"
                        value={search}
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <Table>
                    <colgroup>
                        <col className="w-[28%]" />
                        <col className="w-[20%]" />
                        <col className="w-[14%]" />
                        <col className="w-[30%]" />
                        <col className="w-[8%]" />
                    </colgroup>
                    <TableHead>
                        <tr>
                            <th className="px-5 py-3">User</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-5 py-3">Contact</th>
                            <th className="px-2 py-3 text-right">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </TableHead>
                    <tbody>
                        {isLoadingUsers ? (
                            <>
                                <TableLoadingRow colSpan={5} />
                                <TableLoadingRow colSpan={5} />
                                <TableLoadingRow colSpan={5} />
                            </>
                        ) : usersError ? (
                            <TableMessageRow
                                colSpan={5}
                                message={usersError}
                                tone="error"
                            />
                        ) : filteredUsers.length === 0 ? (
                            <TableMessageRow
                                colSpan={5}
                                message={
                                    search.trim()
                                        ? 'No users matched your search.'
                                        : 'No users found.'
                                }
                                tone="muted"
                            />
                        ) : (
                            filteredUsers.map((managedUser) => (
                                <tr
                                    className="border-t border-slate-200 align-top"
                                    key={managedUser.id}
                                >
                                    <td className="px-5 py-3">
                                        <TableStackCell>
                                            <span className="font-medium text-slate-900">
                                                {managedUser.firstName}{' '}
                                                {managedUser.lastName}
                                            </span>
                                            <span className="truncate text-xs text-slate-500">
                                                {managedUser.email}
                                            </span>
                                        </TableStackCell>
                                    </td>
                                    <td className="px-4 py-3">
                                        <TableStackCell>
                                            <span className="text-slate-900 capitalize">
                                                {managedUser.userType}
                                            </span>
                                            {managedUser.permission ? (
                                                <span className="text-xs text-slate-500 capitalize">
                                                    {managedUser.permission}
                                                </span>
                                            ) : managedUser.designation ? (
                                                <span className="text-xs text-slate-500">
                                                    {managedUser.designation}
                                                </span>
                                            ) : null}
                                            {managedUser.staffId ? (
                                                <span className="text-xs text-slate-500">
                                                    Staff ID:{' '}
                                                    {managedUser.staffId}
                                                </span>
                                            ) : null}
                                        </TableStackCell>
                                    </td>
                                    <td className="px-4 py-3">
                                        <TableSingleLineCell className="text-slate-900 capitalize">
                                            {managedUser.status}
                                        </TableSingleLineCell>
                                    </td>
                                    <td className="px-5 py-3">
                                        <TableStackCell className="text-xs text-slate-500">
                                            {managedUser.phoneNumber ? (
                                                <span className="truncate">
                                                    {managedUser.phoneNumber}
                                                </span>
                                            ) : null}
                                            {managedUser.addressLabel ? (
                                                <span className="truncate">
                                                    {managedUser.addressLabel}
                                                </span>
                                            ) : managedUser.country ? (
                                                <span>
                                                    {managedUser.country}
                                                </span>
                                            ) : (
                                                <span>No contact details</span>
                                            )}
                                        </TableStackCell>
                                    </td>
                                    <TableActionCell>
                                        <ActionMenu
                                            items={[
                                                {
                                                    disabled:
                                                        !canEdit(managedUser),
                                                    icon: FaPenToSquare,
                                                    label: 'Edit',
                                                    onSelect: () =>
                                                        onEdit(managedUser),
                                                },
                                                {
                                                    disabled:
                                                        !canChangeStatus(
                                                            managedUser
                                                        ),
                                                    icon:
                                                        managedUser.status ===
                                                        'active'
                                                            ? FaBan
                                                            : FaPowerOff,
                                                    label:
                                                        managedUser.status ===
                                                        'active'
                                                            ? 'Deactivate'
                                                            : 'Reactivate',
                                                    onSelect: () =>
                                                        onStatusChange(
                                                            managedUser,
                                                            managedUser.status ===
                                                                'active'
                                                                ? 'disabled'
                                                                : 'active'
                                                        ),
                                                    tone:
                                                        managedUser.status ===
                                                        'active'
                                                            ? 'danger'
                                                            : 'default',
                                                },
                                            ]}
                                            label={`Open actions for ${managedUser.firstName} ${managedUser.lastName}`}
                                        />
                                    </TableActionCell>
                                </tr>
                            ))
                        )}
                    </tbody>
                </Table>
            </div>

            {actionError ? (
                <div className="border-t border-slate-200 px-5 py-3">
                    <FormNotice tone="error">{actionError}</FormNotice>
                </div>
            ) : null}
        </section>
    );
}
