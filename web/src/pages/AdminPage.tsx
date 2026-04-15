import { Link } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';

export default function AdminPage() {
    const { user } = useAuth();
    const isSuperadmin =
        user?.userType === 'staff' && user.permission === 'superadmin';

    const links = [
        {
            title: 'Products',
            to: '/admin/products',
        },
        ...(isSuperadmin
            ? [
                  {
                      title: 'Users',
                      to: '/admin/users',
                  },
              ]
            : []),
    ];

    return (
        <section className="grid gap-3 sm:grid-cols-2">
            {links.map((link) => (
                <Link
                    className="rounded border border-slate-200 bg-white px-4 py-4 text-base font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
                    key={link.to}
                    to={link.to}
                >
                    {link.title}
                </Link>
            ))}
        </section>
    );
}
