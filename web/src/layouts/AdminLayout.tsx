import clsx from 'clsx';
import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';
import { PageHeader } from '../components/PageHeader';

export default function AdminLayout() {
    const { user } = useAuth();
    const isSuperadmin =
        user?.userType === 'staff' && user.permission === 'superadmin';
    const navItems = [
        {
            label: 'Overview',
            to: '/admin',
        },
        {
            label: 'Products',
            to: '/admin/products',
        },
        ...(isSuperadmin
            ? [
                  {
                      label: 'Users',
                      to: '/admin/users',
                  },
              ]
            : []),
    ];

    return (
        <section className="grid gap-6">
            <PageHeader
                description="Manage the catalogue, staff operations, and customer accounts."
                title="Admin"
            />

            <nav className="flex flex-wrap gap-2 rounded border border-slate-200 bg-white p-2">
                {navItems.map((item) => (
                    <NavLink
                        className={({ isActive }) =>
                            clsx(
                                'rounded px-3 py-2 text-sm font-medium transition',
                                isActive
                                    ? 'bg-slate-900 text-white'
                                    : 'text-slate-700 hover:bg-slate-100'
                            )
                        }
                        end={item.to === '/admin'}
                        key={item.to}
                        to={item.to}
                    >
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            <Outlet />
        </section>
    );
}
