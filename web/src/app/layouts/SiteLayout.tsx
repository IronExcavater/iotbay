import clsx from 'clsx';
import { Outlet, useLocation } from 'react-router-dom';

import SiteFooter from '@app/layouts/SiteFooter';
import SiteNav from '@app/layouts/SiteNav';

export default function SiteLayout() {
    const location = useLocation();
    const isAdminRoute = location.pathname.startsWith('/admin');

    return (
        <div className="flex h-dvh flex-col overflow-hidden">
            <SiteNav />
            <div
                className="flex min-h-0 flex-1 flex-col overflow-y-scroll [scrollbar-gutter:stable]"
                data-scroll-root=""
            >
                <main
                    className={clsx(
                        'w-full flex-1',
                        isAdminRoute
                            ? 'py-0'
                            : 'mx-auto max-w-6xl px-4 py-8 sm:px-6'
                    )}
                >
                    <Outlet />
                </main>
                {isAdminRoute ? null : <SiteFooter />}
            </div>
        </div>
    );
}
