import clsx from 'clsx';
import {
    FaBoxArchive,
    FaChevronLeft,
    FaChevronRight,
    FaUsers,
} from 'react-icons/fa6';
import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';
import { Button } from '../components/form/Button';
import { Tooltip } from '../components/ui/Tooltip';
import { useStoredBoolean } from '../hooks/useStoredBoolean';

export default function AdminLayout() {
    const { user } = useAuth();
    const isSuperadmin =
        user?.userType === 'staff' && user.permission === 'superadmin';
    const [isCollapsed, setIsCollapsed] = useStoredBoolean(
        'admin-nav-collapsed'
    );
    const navItems = [
        {
            icon: FaBoxArchive,
            label: 'Products',
            to: '/admin/products',
        },
        ...(isSuperadmin
            ? [
                  {
                      icon: FaUsers,
                      label: 'Users',
                      to: '/admin/users',
                  },
              ]
            : []),
    ];

    return (
        <section className="min-h-[calc(100vh-73px)] md:grid md:grid-cols-[auto_minmax(0,1fr)]">
            <div className="bg-surface-0 border-b border-slate-200 px-4 py-4 sm:px-6 md:hidden">
                <div className="grid gap-3">
                    <h1 className="text-lg font-semibold tracking-tight text-slate-900">
                        Admin
                    </h1>

                    <nav className="flex flex-wrap gap-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;

                            return (
                                <NavLink
                                    className={({ isActive }) =>
                                        clsx(
                                            'inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition',
                                            isActive
                                                ? 'bg-primary text-primary-fg'
                                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                        )
                                    }
                                    key={item.to}
                                    to={item.to}
                                >
                                    <Icon
                                        aria-hidden="true"
                                        className="size-4 shrink-0"
                                    />
                                    <span>{item.label}</span>
                                </NavLink>
                            );
                        })}
                    </nav>
                </div>
            </div>

            <aside
                className={clsx(
                    'bg-surface-0 hidden overflow-hidden border-b border-slate-200 transition-[width] duration-200 ease-out md:sticky md:top-18 md:block md:h-[calc(100vh-72px)] md:self-start md:border-r md:border-b-0',
                    isCollapsed ? 'md:w-19' : 'md:w-60'
                )}
            >
                <div
                    className={clsx(
                        'border-b border-slate-200 px-2 py-3',
                        'flex items-center'
                    )}
                >
                    {!isCollapsed ? (
                        <span className="min-w-0 flex-1 px-2 text-xl font-semibold tracking-tight text-slate-900">
                            Admin
                        </span>
                    ) : null}

                    <Button
                        aria-label={
                            isCollapsed
                                ? 'Expand admin sidebar'
                                : 'Collapse admin sidebar'
                        }
                        className={clsx(
                            'inline-flex size-9 shrink-0 items-center justify-center rounded-full p-0',
                            !isCollapsed && 'ml-auto'
                        )}
                        onClick={() => {
                            setIsCollapsed(!isCollapsed);
                        }}
                        title={
                            isCollapsed
                                ? 'Expand admin sidebar'
                                : 'Collapse admin sidebar'
                        }
                        type="button"
                        variant="ghost"
                    >
                        {isCollapsed ? (
                            <FaChevronRight
                                aria-hidden="true"
                                className="size-3.5"
                            />
                        ) : (
                            <FaChevronLeft
                                aria-hidden="true"
                                className="size-3.5"
                            />
                        )}
                    </Button>
                </div>

                <nav className="grid gap-1 p-2 pt-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;

                        return (
                            <Tooltip
                                className="w-full"
                                key={item.to}
                                label={isCollapsed ? item.label : undefined}
                                side="right"
                            >
                                <NavLink
                                    className={({ isActive }) =>
                                        clsx(
                                            'flex h-11 items-center rounded-lg px-3 text-sm font-medium',
                                            !isCollapsed && 'gap-3',
                                            isActive
                                                ? 'bg-primary text-primary-fg'
                                                : 'text-slate-700 hover:bg-slate-100'
                                        )
                                    }
                                    to={item.to}
                                >
                                    <Icon
                                        aria-hidden="true"
                                        className="size-4 shrink-0"
                                    />
                                    {!isCollapsed ? (
                                        <span>{item.label}</span>
                                    ) : null}
                                </NavLink>
                            </Tooltip>
                        );
                    })}
                </nav>
            </aside>

            <div className="min-w-0 px-4 py-4 sm:px-6 md:px-8">
                <Outlet />
            </div>
        </section>
    );
}
