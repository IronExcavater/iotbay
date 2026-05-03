import type { ReactNode } from 'react';
import {
    FaArrowsRotate,
    FaBan,
    FaPenToSquare,
    FaPowerOff,
} from 'react-icons/fa6';
import { Link, useNavigate } from 'react-router-dom';

import type { ManagedUser } from '@features/users/api';
import { Button } from '@shared/ui/form/Button';
import { FormNotice } from '@shared/ui/form/FormNotice';
import { SearchInput } from '@shared/ui/form/SearchInput';
import { ActionMenu } from '@shared/ui/overlay/ActionMenu';
import {
    Table,
    TableActionCell,
    TableHead,
    TableLoadingRow,
    TableMessageRow,
    TableSingleLineCell,
    TableStackCell,
} from '@shared/ui/table/Table';

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
    toolbarAction?: ReactNode;
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
    toolbarAction,
    usersError,
}: UsersTableProps) {
    const navigate = useNavigate();

    return (
        <section className="bg-ui-0 border-ui-200 overflow-hidden rounded border">
            <div className="border-ui-200 flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-ui-900 text-xl font-semibold tracking-tight">
                        Users
                    </h2>

                    <Button
                        aria-label="Refresh users"
                        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full p-0"
                        onClick={onRefresh}
                        type="button"
                        variant="ghost"
                    >
                        <FaArrowsRotate
                            aria-hidden="true"
                            className="size-3.5"
                        />
                    </Button>
                </div>

                <div className="flex flex-1 flex-wrap items-center justify-end gap-3 sm:flex-nowrap">
                    <SearchInput
                        className="w-full sm:w-72 md:w-80"
                        onChange={onSearchChange}
                        placeholder="Search users"
                        value={search}
                    />

                    {toolbarAction && (
                        <div className="shrink-0">{toolbarAction}</div>
                    )}
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
                                    className="border-ui-200 hover:bg-ui-50 cursor-pointer border-t align-top"
                                    key={managedUser.id}
                                    onClick={() => {
                                        navigate(
                                            `/admin/users/${managedUser.id}`
                                        );
                                    }}
                                >
                                    <td className="px-5 py-3">
                                        <TableStackCell>
                                            <Link
                                                className="text-ui-900 font-medium"
                                                to={`/admin/users/${managedUser.id}`}
                                            >
                                                {managedUser.firstName}{' '}
                                                {managedUser.lastName}
                                            </Link>
                                            <span className="text-ui-500 truncate text-xs">
                                                {managedUser.email}
                                            </span>
                                        </TableStackCell>
                                    </td>
                                    <td className="px-4 py-3">
                                        <TableStackCell>
                                            <span className="text-ui-900 capitalize">
                                                {managedUser.userType}
                                            </span>
                                            {managedUser.permission && (
                                                <span className="text-ui-500 text-xs capitalize">
                                                    {managedUser.permission}
                                                </span>
                                            )}
                                            {!managedUser.permission &&
                                                managedUser.designation && (
                                                    <span className="text-ui-500 text-xs">
                                                        {
                                                            managedUser.designation
                                                        }
                                                    </span>
                                                )}
                                        </TableStackCell>
                                    </td>
                                    <td className="px-4 py-3">
                                        <TableSingleLineCell className="text-ui-900 capitalize">
                                            {managedUser.status}
                                        </TableSingleLineCell>
                                    </td>
                                    <td className="px-5 py-3">
                                        <TableStackCell className="text-ui-500 text-xs">
                                            {managedUser.staffId && (
                                                <span className="truncate">
                                                    Staff ID:{' '}
                                                    {managedUser.staffId}
                                                </span>
                                            )}
                                            {managedUser.phoneNumber && (
                                                <span className="truncate">
                                                    {managedUser.phoneNumber}
                                                </span>
                                            )}
                                            {managedUser.addressLabel ? (
                                                <span className="truncate">
                                                    {managedUser.addressLabel}
                                                </span>
                                            ) : managedUser.country ? (
                                                <span>
                                                    {managedUser.country}
                                                </span>
                                            ) : !managedUser.staffId &&
                                              !managedUser.phoneNumber ? (
                                                <span>No contact details</span>
                                            ) : null}
                                        </TableStackCell>
                                    </td>
                                    <TableActionCell>
                                        <div
                                            onClick={(event) => {
                                                event.stopPropagation();
                                            }}
                                        >
                                            <ActionMenu
                                                items={[
                                                    {
                                                        disabled:
                                                            !canEdit(
                                                                managedUser
                                                            ),
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
                                        </div>
                                    </TableActionCell>
                                </tr>
                            ))
                        )}
                    </tbody>
                </Table>
            </div>

            {actionError && (
                <div className="border-ui-200 border-t px-5 py-3">
                    <FormNotice tone="error">{actionError}</FormNotice>
                </div>
            )}
        </section>
    );
}
