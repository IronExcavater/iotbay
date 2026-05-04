import { useRef, useState, type ReactNode } from 'react';
import { FaCartShopping, FaDisplay, FaMoon, FaSun } from 'react-icons/fa6';
import { NavLink, useNavigate } from 'react-router-dom';

import { AccountMenu } from '@app/layouts/site-nav/AccountMenu';
import { BrandLink } from '@app/layouts/site-nav/BrandLink';
import { ThemeMenuItem, ThemeToggle } from '@app/layouts/site-nav/ThemeToggle';
import { useThemeMode } from '@app/theme/ThemeProvider';
import { useAuth } from '@features/auth/AuthProvider';
import { useCart } from '@features/cart/CartProvider';
import { ButtonLink } from '@shared/ui/form/Button';
import { IconButton } from '@shared/ui/form/IconButton';
import { AnchoredPopover } from '@shared/ui/overlay/AnchoredPopover';
import { MenuPanel } from '@shared/ui/overlay/MenuItems';

export default function SiteNav() {
    const navigate = useNavigate();
    const { logout, user } = useAuth();
    const { mode, setMode } = useThemeMode();
    const { items: cartItems } = useCart();
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

                        <div className="-mx-1 -my-0.5 overflow-x-auto px-1 py-0.5">
                            <nav className="flex items-center gap-1 text-sm whitespace-nowrap">
                                <SiteNavLink to="/products">
                                    Catalogue
                                </SiteNavLink>
                                <SiteNavLink to="/orders">Orders</SiteNavLink>
                            </nav>
                        </div>

                        <nav className="flex flex-wrap items-center justify-end gap-2.5 text-sm sm:gap-3">
                            <IconButton
                                aria-label={
                                    cartItems.length > 0
                                        ? `Cart, ${cartItems.length} item${cartItems.length !== 1 ? 's' : ''}`
                                        : 'Cart'
                                }
                                badge={
                                    cartItems.length > 0 && (
                                        <span
                                            aria-hidden="true"
                                            className="bg-ui-900 text-ui-0 pointer-events-none absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold"
                                        >
                                            {cartItems.length}
                                        </span>
                                    )
                                }
                                onClick={() => navigate('/cart')}
                                size="md"
                                type="button"
                            >
                                <FaCartShopping
                                    aria-hidden="true"
                                    className="size-4"
                                />
                            </IconButton>

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
                                    profileImageUrl={user.profileImageUrl}
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
                `focus-visible:ring-ui-900 rounded px-3 py-1.5 font-medium transition-[background-color,color] outline-none focus-visible:ring-2 ${
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
