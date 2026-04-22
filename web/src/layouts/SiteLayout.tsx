import clsx from 'clsx';
import { Outlet, useLocation } from 'react-router-dom';

import SiteFooter from '../components/SiteFooter';
import SiteNav from '../components/SiteNav';

export default function SiteLayout() {
    const location = useLocation();
    const isAdminRoute = location.pathname.startsWith('/admin');

    return (
        <div className="flex min-h-screen flex-col">
            <SiteNav />
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
    );
}
