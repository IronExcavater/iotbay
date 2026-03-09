import { Outlet } from 'react-router-dom';

import PageHeader from '../components/PageHeader';

export default function AppLayout() {
    return (
        <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-6 py-8">
            <PageHeader />
            <main className="flex-1 py-8">
                <Outlet />
            </main>
        </div>
    );
}
