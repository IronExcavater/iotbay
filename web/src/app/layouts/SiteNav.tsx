import { useRef, useState, type ReactNode } from 'react';
import { FaDisplay, FaMoon, FaSun } from 'react-icons/fa6';
import { NavLink, useNavigate } from 'react-router-dom';

import { AccountMenu } from '@app/layouts/site-nav/AccountMenu';
import { BrandLink } from '@app/layouts/site-nav/BrandLink';
import { ThemeMenuItem, ThemeToggle } from '@app/layouts/site-nav/ThemeToggle';
import { useThemeMode } from '@app/theme/ThemeProvider';
import { useAuth } from '@features/auth/AuthProvider';
import { ButtonLink } from '@shared/ui/form/Button';
import { AnchoredPopover } from '@shared/ui/overlay/AnchoredPopover';
import { MenuPanel } from '@shared/ui/overlay/MenuItems';

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
        <header className="bg-ui-0/95 border-ui-200/90 sticky top-0 z-30 border-b backdrop-blur">
            <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-3 px-4 py-4 sm:px-6">
                <div aria-hidden="true" className="size-10" />

                <div className="mx-auto w-full max-w-6xl">
                    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 lg:gap-6">
                        <BrandLink />

                        <nav className="flex min-w-0 items-center gap-1 overflow-x-auto text-sm">
                            <SiteNavLink to="/products">Catalogue</SiteNavLink>
                            <SiteNavLink to="/orders">Orders</SiteNavLink>
                        </nav>

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
                                    <ButtonLink
                                        className="px-3"
                                        to="/sign-in"
                                        variant="secondary"
                                    >
                                        Sign in
                                    </ButtonLink>

                                    <ButtonLink className="px-3" to="/sign-up">
                                        Sign up
                                    </ButtonLink>
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
                        zIndex={40}
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

function SiteNavLink({ children, to }: { children: ReactNode; to: string }) {
    return (
        <NavLink
            className={({ isActive }) =>
                `rounded px-3 py-2 font-medium transition-[background-color,color] ${
                    isActive
                        ? 'bg-ui-100 text-ui-900'
                        : 'text-ui-600 hover:bg-ui-100 hover:text-ui-900'
                }`
            }
            to={to}
        >
            {children}
        </NavLink>
    );
}
