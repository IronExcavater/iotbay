import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '../components/form/Button';
import { inputClassName } from '../components/form/Input';
import { toErrorMessage } from '../services/http';
import type { ManagedUser } from '../users/api';
import { usersApi } from '../users/api';

export default function AdminUsersPage() {
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [usersError, setUsersError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const abortController = new AbortController();

        async function loadUsers() {
            try {
                setUsers(await usersApi.list(abortController.signal));
                setUsersError(null);
            } catch (error) {
                if (!abortController.signal.aborted) {
                    setUsersError(
                        toErrorMessage(error, 'Unable to load registered users')
                    );
                }
            } finally {
                if (!abortController.signal.aborted) {
                    setIsLoadingUsers(false);
                }
            }
        }

        void loadUsers();
        return () => abortController.abort();
    }, []);

    const normalizedSearch = search.trim().toLowerCase();
    const filteredUsers = users.filter((managedUser) => {
        if (!normalizedSearch) {
            return true;
        }

        return [
            managedUser.email,
            managedUser.firstName,
            managedUser.lastName,
            managedUser.userType,
            managedUser.status,
            managedUser.permission ?? '',
            managedUser.designation ?? '',
            managedUser.staffId ?? '',
        ].some((value) => value.toLowerCase().includes(normalizedSearch));
    });

    return (
        <section className="grid gap-6">
            <header className="grid gap-3 sm:flex sm:items-end sm:justify-between">
                <div className="grid gap-2">
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                        Manage users
                    </h2>
                    <p className="text-sm text-slate-600">
                        Review registered customers and staff accounts.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link to="/admin/users/invite-staff">
                        <Button type="button" variant="primary">
                            Invite staff
                        </Button>
                    </Link>
                    <Link to="/admin">
                        <Button type="button" variant="secondary">
                            Back to admin
                        </Button>
                    </Link>
                </div>
            </header>

            <section className="rounded border border-slate-200 bg-white p-5">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                    <label className="grid gap-2">
                        <span className="text-sm font-medium text-slate-700">
                            Search users
                        </span>
                        <input
                            className={inputClassName(false)}
                            onChange={(event) => {
                                setSearch(event.target.value);
                            }}
                            placeholder="Search by name, email, role or status"
                            value={search}
                        />
                    </label>
                    <p className="text-sm text-slate-500">
                        {filteredUsers.length} user
                        {filteredUsers.length === 1 ? '' : 's'}
                    </p>
                </div>

                {usersError ? (
                    <p className="mt-5 text-sm text-red-700">{usersError}</p>
                ) : isLoadingUsers ? (
                    <p className="mt-5 text-sm text-slate-500">Loading users</p>
                ) : filteredUsers.length === 0 ? (
                    <p className="mt-5 text-sm text-slate-500">
                        No users matched your search.
                    </p>
                ) : (
                    <div className="mt-5 overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead className="border-b border-slate-200 bg-slate-100 text-xs font-semibold tracking-[0.12em] text-slate-700 uppercase">
                                <tr>
                                    <th className="px-4 py-3">User</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Contact</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((managedUser) => (
                                    <tr
                                        className="border-t border-slate-200 align-top"
                                        key={managedUser.id}
                                    >
                                        <td className="px-4 py-3">
                                            <div className="grid gap-1">
                                                <span className="font-medium text-slate-900">
                                                    {managedUser.firstName}{' '}
                                                    {managedUser.lastName}
                                                </span>
                                                <span className="text-slate-600">
                                                    {managedUser.email}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="grid gap-1">
                                                <span className="text-slate-900 capitalize">
                                                    {managedUser.userType}
                                                </span>
                                                {managedUser.permission ? (
                                                    <span className="text-slate-600 capitalize">
                                                        {managedUser.permission}
                                                    </span>
                                                ) : managedUser.designation ? (
                                                    <span className="text-slate-600">
                                                        {
                                                            managedUser.designation
                                                        }
                                                    </span>
                                                ) : null}
                                                {managedUser.staffId ? (
                                                    <span className="text-slate-600">
                                                        Staff ID:{' '}
                                                        {managedUser.staffId}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-slate-900 capitalize">
                                                {managedUser.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="grid gap-1 text-slate-600">
                                                {managedUser.phoneNumber ? (
                                                    <span>
                                                        {
                                                            managedUser.phoneNumber
                                                        }
                                                    </span>
                                                ) : null}
                                                {managedUser.addressLabel ? (
                                                    <span>
                                                        {
                                                            managedUser.addressLabel
                                                        }
                                                    </span>
                                                ) : managedUser.country ? (
                                                    <span>
                                                        {managedUser.country}
                                                    </span>
                                                ) : (
                                                    <span>
                                                        No contact details
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </section>
    );
}
