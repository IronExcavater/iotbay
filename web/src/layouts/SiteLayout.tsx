import { Outlet } from 'react-router-dom';

import SiteFooter from '../components/SiteFooter';
import SiteNav from '../components/SiteNav';

export default function SiteLayout() {
    return (
        <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
            <SiteNav />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
                <Outlet />
            </main>
            <SiteFooter />
        </div>
    );
}
