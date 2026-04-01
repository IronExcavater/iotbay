import { Navigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';

export default function AccountPage() {
    const { isAuthenticated, isLoading, user } = useAuth();

    if (!isLoading && !isAuthenticated) {
        return <Navigate replace to="/auth?mode=signin" />;
    }

    return (
        <section className="mx-auto grid max-w-3xl gap-6">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Account
            </h1>

            {user ? (
                <div className="overflow-hidden rounded border border-slate-200 bg-white">
                    <table className="min-w-full text-left text-sm">
                        <tbody>
                            {[
                                ['Name', `${user.firstName} ${user.lastName}`],
                                ['Email', user.email],
                                ['User type', user.userType],
                                ['Status', user.status],
                            ].map(([label, value]) => (
                                <tr
                                    className="border-t border-slate-200 first:border-t-0"
                                    key={label}
                                >
                                    <th className="w-48 bg-slate-50 px-4 py-3 font-medium text-slate-600">
                                        {label}
                                    </th>
                                    <td className="px-4 py-3">{value}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-slate-500">Loading account.</p>
            )}
        </section>
    );
}
