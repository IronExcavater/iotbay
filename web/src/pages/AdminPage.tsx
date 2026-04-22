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
                    className="bg-ui-0 text-ui-900 hover:bg-ui-50 ring-ui-200 hover:ring-ui-300 focus-visible:ring-ui-900 rounded px-4 py-4 text-base font-medium ring-1 transition-[background-color,box-shadow,color] outline-none focus-visible:ring-2"
                    key={link.to}
                    to={link.to}
                >
                    {link.title}
                </Link>
            ))}
        </section>
    );
}
