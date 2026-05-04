import clsx from 'clsx';
import {
    FaBoxArchive,
    FaChevronLeft,
    FaChevronRight,
    FaClipboardList,
    FaUsers,
} from 'react-icons/fa6';
import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '@features/auth/AuthProvider';
import { useStoredBoolean } from '@shared/hooks/useStoredBoolean';
import { Button } from '@shared/ui/form/Button';
import { Tooltip } from '@shared/ui/Tooltip';

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
                  {
                      icon: FaClipboardList,
                      label: 'Access logs',
                      to: '/admin/access-logs',
                  },
              ]
            : []),
    ];

    return (
        <section className="min-h-full md:flex md:items-start">
            <div className="bg-ui-0 border-ui-200 border-b px-4 sm:px-6 md:hidden">
                <nav className="-mb-px flex overflow-x-auto">
                    {navItems.map((item) => {
                        const Icon = item.icon;

                        return (
                            <NavLink
                                className={({ isActive }) =>
                                    clsx(
                                        'inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition',
                                        isActive
                                            ? 'border-ui-900 text-ui-900'
                                            : 'text-ui-500 hover:border-ui-300 hover:text-ui-700 border-transparent'
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

            <aside
                className={clsx(
                    'bg-ui-0 border-ui-200 hidden overflow-hidden border-b transition-[width] duration-200 ease-out md:sticky md:top-0 md:block md:h-[calc(100dvh-73px)] md:shrink-0 md:self-start md:border-r md:border-b-0',
                    isCollapsed ? 'md:w-14' : 'md:w-56'
                )}
            >
                <div
                    className={clsx(
                        'border-ui-200 h-16 overflow-hidden border-b px-2',
                        'flex items-center'
                    )}
                >
                    <span
                        aria-hidden={isCollapsed ? 'true' : 'false'}
                        className={clsx(
                            'text-ui-900 overflow-hidden text-xl font-semibold tracking-tight whitespace-nowrap transition-[width,padding,opacity] duration-200 ease-out',
                            isCollapsed
                                ? 'w-0 px-0 opacity-0'
                                : 'w-32 px-2 opacity-100'
                        )}
                    >
                        Admin
                    </span>

                    <Button
                        aria-label={
                            isCollapsed
                                ? 'Expand admin sidebar'
                                : 'Collapse admin sidebar'
                        }
                        className={clsx(
                            'ml-auto inline-flex size-9 shrink-0 items-center justify-center rounded-full p-0 transition-[background-color,color,box-shadow] duration-200 ease-out'
                        )}
                        onClick={() => {
                            setIsCollapsed(!isCollapsed);
                        }}
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
                                            'flex h-11 w-full items-center rounded-lg px-3 text-sm font-medium transition-[background-color,color,gap] duration-200 ease-out',
                                            isCollapsed ? '' : 'gap-3',
                                            isActive
                                                ? 'bg-ui-950 text-ui-0'
                                                : 'text-ui-700 hover:bg-ui-100'
                                        )
                                    }
                                    to={item.to}
                                >
                                    <Icon
                                        aria-hidden="true"
                                        className="size-4 shrink-0"
                                    />
                                    {!isCollapsed && <span>{item.label}</span>}
                                </NavLink>
                            </Tooltip>
                        );
                    })}
                </nav>
            </aside>

            <div className="px-4 py-4 sm:px-6 md:w-0 md:flex-1 md:px-8">
                <Outlet />
            </div>
        </section>
    );
}
