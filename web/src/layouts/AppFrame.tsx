import { Outlet } from 'react-router-dom';

import NavBar from '../components/NavBar';

export default function AppFrame() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <NavBar />

            <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
                <Outlet />
            </main>
        </div>
    );
}
