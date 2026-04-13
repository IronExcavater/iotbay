import { Link } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';
import { Button } from '../components/form/Button';

export default function AdminPage() {
    const { user } = useAuth();
    const isSuperadmin =
        user?.userType === 'staff' && user.permission === 'superadmin';

    const cards = [
        {
            cta: 'Manage products',
            description:
                'Create, edit, and remove catalogue items from the admin area.',
            title: 'Products',
            to: '/admin/products',
        },
        ...(isSuperadmin
            ? [
                  {
                      cta: 'Manage users',
                      description:
                          'Review customer and staff accounts and search across the current directory.',
                      title: 'Users',
                      to: '/admin/users',
                  },
                  {
                      cta: 'Invite staff',
                      description:
                          'Send registration links to new staff members and assign their access level.',
                      title: 'Staff invites',
                      to: '/admin/users/invite-staff',
                  },
              ]
            : []),
    ];

    return (
        <section className="grid gap-6">
            <div className="grid gap-2">
                <h2 className="text-xl font-semibold text-slate-900">
                    Admin home
                </h2>
                <p className="text-sm text-slate-600">
                    Use the sections below to move between catalogue and staff
                    administration.
                </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                {cards.map((card) => (
                    <section
                        className="grid gap-4 rounded border border-slate-200 bg-white p-5"
                        key={card.title}
                    >
                        <div className="grid gap-2">
                            <h3 className="text-lg font-semibold text-slate-900">
                                {card.title}
                            </h3>
                            <p className="text-sm text-slate-600">
                                {card.description}
                            </p>
                        </div>

                        <div className="mt-auto">
                            <Link to={card.to}>
                                <Button type="button" variant="secondary">
                                    {card.cta}
                                </Button>
                            </Link>
                        </div>
                    </section>
                ))}
            </div>
        </section>
    );
}
