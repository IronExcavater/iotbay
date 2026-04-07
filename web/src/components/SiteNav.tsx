import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { FiChevronDown, FiUser } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';

export default function SiteNav() {
    const navigate = useNavigate();
    const { logout, user } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const profileLabel = user
        ? `${user.firstName} ${user.lastName}`
        : 'Profile';
    const showProfileMenu = user !== null;

    useEffect(() => {
        if (!isMenuOpen) {
            return;
        }

        function handlePointerDown(event: MouseEvent) {
            if (!menuRef.current?.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsMenuOpen(false);
            }
        }

        window.addEventListener('mousedown', handlePointerDown);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('mousedown', handlePointerDown);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isMenuOpen]);

    useEffect(() => {
        setIsMenuOpen(false);
    }, [showProfileMenu]);

    async function handleSignOut() {
        setIsMenuOpen(false);
        await logout();
        navigate('/');
    }

    return (
        <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
                <Link
                    className="group relative -mx-2 rounded px-2 py-1 text-base font-semibold tracking-[0.2em] text-slate-950 uppercase transition-transform duration-200 ease-out outline-none hover:scale-[1.02] focus-visible:scale-[1.02] focus-visible:outline-none"
                    to="/"
                >
                    <span className="inline-block transition-[letter-spacing,transform] duration-200 ease-out group-hover:tracking-[0.24em] group-focus-visible:-translate-y-0.5 group-focus-visible:tracking-[0.24em]">
                        IoTBay
                    </span>
                    <span
                        aria-hidden="true"
                        className="absolute right-3 bottom-0 left-2 h-0.5 origin-left scale-x-0 rounded-full bg-slate-900 transition-transform duration-200 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100"
                    />
                </Link>

                <nav className="flex items-center gap-3 text-sm">
                    {showProfileMenu ? (
                        <div className="relative" ref={menuRef}>
                            <button
                                aria-label={
                                    isMenuOpen
                                        ? 'Close account menu'
                                        : 'Open account menu'
                                }
                                className="flex items-center gap-2 rounded border border-slate-300 px-3 py-2 text-slate-700 hover:bg-slate-100"
                                onClick={() => {
                                    setIsMenuOpen((current) => !current);
                                }}
                                title={
                                    isMenuOpen
                                        ? 'Close account menu'
                                        : 'Open account menu'
                                }
                                type="button"
                            >
                                <FiUser aria-hidden="true" size={18} />
                                <span className="hidden sm:inline">
                                    {profileLabel}
                                </span>
                                <FiChevronDown
                                    aria-hidden="true"
                                    className={clsx(
                                        'transition-transform duration-200 ease-out',
                                        isMenuOpen && 'rotate-180'
                                    )}
                                    size={18}
                                />
                            </button>

                            {isMenuOpen ? (
                                <div
                                    className="absolute top-full right-0 z-10 mt-2 grid min-w-48 gap-1 rounded border border-slate-200 bg-white p-2 shadow-sm"
                                >
                                    {user.userType === 'staff' ? (
                                        <Link
                                            className="rounded px-3 py-2 text-left hover:bg-slate-100"
                                            onClick={() => {
                                                setIsMenuOpen(false);
                                            }}
                                            to="/admin"
                                        >
                                            Staff portal
                                        </Link>
                                    ) : null}
                                    <Link
                                        className="rounded px-3 py-2 text-left hover:bg-slate-100"
                                        onClick={() => {
                                            setIsMenuOpen(false);
                                        }}
                                        to="/account"
                                    >
                                        Manage account
                                    </Link>
                                    <button
                                        className="rounded px-3 py-2 text-left hover:bg-slate-100"
                                        onClick={() => {
                                            void handleSignOut();
                                        }}
                                        title="Log out"
                                        type="button"
                                    >
                                        Log out
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    ) : (
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
                    )}
                </nav>
            </div>
        </header>
    );
}
