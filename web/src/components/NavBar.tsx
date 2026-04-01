import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';

export default function NavBar() {
    const navigate = useNavigate();
    const { isAuthenticated, isLoading, logout, user } = useAuth();
    const name = user ? `${user.firstName} ${user.lastName}` : '';

    async function handleSignOut() {
        await logout();
        navigate('/');
    }

    let navContent: ReactNode;

    if (isLoading) {
        navContent = <span className="text-slate-500">Loading</span>;
    } else if (isAuthenticated && user) {
        navContent = (
            <>
                <span className="hidden text-slate-500 sm:inline">{name}</span>
                <Link
                    className="rounded border border-slate-300 px-3 py-2 hover:bg-slate-100"
                    to="/account"
                >
                    Account
                </Link>
                <button
                    className="rounded border border-slate-300 px-3 py-2 hover:bg-slate-100"
                    onClick={() => {
                        void handleSignOut();
                    }}
                    type="button"
                >
                    Sign out
                </button>
            </>
        );
    } else {
        navContent = (
            <>
                <Link
                    className="rounded border border-slate-300 px-3 py-2 hover:bg-slate-100"
                    to="/auth?mode=signin"
                >
                    Sign in
                </Link>
                <Link
                    className="rounded bg-slate-900 px-3 py-2 text-white hover:bg-slate-700"
                    to="/auth?mode=signup"
                >
                    Sign up
                </Link>
            </>
        );
    }

    return (
        <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
                <Link
                    className="text-sm font-semibold tracking-[0.18em] uppercase"
                    to="/"
                >
                    IOTBay
                </Link>

                <nav className="flex items-center gap-3 text-sm">
                    {navContent}
                </nav>
            </div>
        </header>
    );
}
