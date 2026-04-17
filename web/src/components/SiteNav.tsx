import { useRef, useState } from 'react';
import { FaDisplay, FaMoon, FaSun } from 'react-icons/fa6';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';
import { useThemeMode } from '../theme/ThemeProvider';
import { AnchoredPopover } from './overlay/AnchoredPopover';
import { MenuPanel } from './overlay/MenuItems';
import { AccountMenu } from './site-nav/AccountMenu';
import { BrandLink } from './site-nav/BrandLink';
import { ThemeMenuItem, ThemeToggle } from './site-nav/ThemeToggle';

export default function SiteNav() {
    const navigate = useNavigate();
    const { logout, user } = useAuth();
    const { mode, setMode } = useThemeMode();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const themeMenuRef = useRef<HTMLDivElement | null>(null);

    const profileLabel = user
        ? `${user.firstName} ${user.lastName}`
        : 'Profile';
    const menuLabel = isMenuOpen ? 'Close account menu' : 'Open account menu';
    const showStaffPortal = user?.userType === 'staff';

    async function handleSignOut() {
        setIsMenuOpen(false);
        await logout();
        navigate('/');
    }

    return (
        <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur">
            <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-3 px-4 py-4 sm:px-6">
                <div aria-hidden="true" className="size-10" />

                <div className="mx-auto w-full max-w-6xl">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 lg:gap-6">
                        <BrandLink />

                        <nav className="flex flex-wrap items-center justify-end gap-2.5 text-sm sm:gap-3">
                            {user ? (
                                <AccountMenu
                                    menuLabel={menuLabel}
                                    menuRef={menuRef}
                                    onClose={() => {
                                        setIsMenuOpen(false);
                                    }}
                                    onSignOut={() => {
                                        void handleSignOut();
                                    }}
                                    open={isMenuOpen}
                                    profileLabel={profileLabel}
                                    showStaffPortal={showStaffPortal}
                                    onToggle={() => {
                                        setIsMenuOpen((current) => !current);
                                    }}
                                />
                            ) : (
                                <>
                                    <Link
                                        className="rounded border border-slate-300 px-3 py-2 hover:bg-slate-100"
                                        to="/sign-in"
                                    >
                                        Sign in
                                    </Link>

                                    <Link
                                        className="rounded bg-slate-900 px-3 py-2 text-white hover:bg-slate-700"
                                        to="/sign-up"
                                    >
                                        Sign up
                                    </Link>
                                </>
                            )}
                        </nav>
                    </div>
                </div>

                <div className="justify-self-end" ref={themeMenuRef}>
                    <ThemeToggle
                        mode={mode}
                        onOpenChange={setIsThemeMenuOpen}
                        open={isThemeMenuOpen}
                    />
                    <AnchoredPopover
                        align="right"
                        anchorRef={themeMenuRef}
                        className="min-w-44"
                        onClose={() => {
                            setIsThemeMenuOpen(false);
                        }}
                        open={isThemeMenuOpen}
                    >
                        <MenuPanel>
                            <ThemeMenuItem
                                active={mode === 'light'}
                                icon={
                                    <FaSun
                                        aria-hidden="true"
                                        className="size-3.5"
                                    />
                                }
                                label="Light"
                                onSelect={() => {
                                    setMode('light');
                                    setIsThemeMenuOpen(false);
                                }}
                            />
                            <ThemeMenuItem
                                active={mode === 'dark'}
                                icon={
                                    <FaMoon
                                        aria-hidden="true"
                                        className="size-3.5"
                                    />
                                }
                                label="Dark"
                                onSelect={() => {
                                    setMode('dark');
                                    setIsThemeMenuOpen(false);
                                }}
                            />
                            <ThemeMenuItem
                                active={mode === 'system'}
                                icon={
                                    <FaDisplay
                                        aria-hidden="true"
                                        className="size-3.5"
                                    />
                                }
                                label="System"
                                onSelect={() => {
                                    setMode('system');
                                    setIsThemeMenuOpen(false);
                                }}
                            />
                        </MenuPanel>
                    </AnchoredPopover>
                </div>
            </div>
        </header>
    );
}
