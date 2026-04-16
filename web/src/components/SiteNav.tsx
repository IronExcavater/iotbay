import { useRef, useState, type ReactNode } from 'react';
import {
    FaArrowRightFromBracket,
    FaDisplay,
    FaIdBadge,
    FaMoon,
    FaShieldHalved,
    FaSun,
    FaUser,
} from 'react-icons/fa6';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';
import { useThemeMode } from '../theme/ThemeProvider';
import { DropdownChevron } from './form/DropdownChevron';
import { AnchoredPopover } from './overlay/AnchoredPopover';
import { MenuLinkItem, MenuItem, MenuPanel } from './overlay/MenuItems';

export default function SiteNav() {
    const navigate = useNavigate();
    const { logout, user } = useAuth();
    const { mode, resolvedMode, setMode } = useThemeMode();
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
            <div className="relative">
                <div className="mx-auto flex w-full max-w-6xl items-center px-4 py-4 pr-18 sm:px-6 sm:pr-22">
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
                        <Link
                            className="group relative -mx-2 inline-flex items-center gap-3 rounded px-2 py-1 text-base font-semibold tracking-[0.2em] text-slate-950 uppercase transition-transform duration-200 ease-out outline-none hover:scale-[1.02] focus-visible:scale-[1.02] focus-visible:outline-none"
                            to="/"
                        >
                            <img
                                alt="IoTBay icon"
                                className="h-8 w-auto shrink-0"
                                loading="eager"
                                src="/iotbay_icon_themed.svg"
                            />
                            <span className="inline-block transition-[letter-spacing,transform] duration-200 ease-out group-hover:tracking-[0.24em] group-focus-visible:-translate-y-0.5 group-focus-visible:tracking-[0.24em]">
                                IoTBay
                            </span>

                            <span
                                aria-hidden="true"
                                className="absolute right-3 bottom-0 left-12 h-0.5 origin-left scale-x-0 rounded-full bg-slate-900 transition-transform duration-200 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100"
                            />
                        </Link>

                        <nav className="flex flex-wrap items-center justify-end gap-3 text-sm">
                            {user ? (
                                <div className="relative" ref={menuRef}>
                                    <button
                                        aria-label={menuLabel}
                                        className="flex items-center gap-2 rounded border border-slate-300 px-3 py-2 text-slate-700 hover:bg-slate-100"
                                        onClick={() => {
                                            setIsMenuOpen((current) => !current);
                                        }}
                                        title={menuLabel}
                                        type="button"
                                    >
                                        <FaUser
                                            aria-hidden="true"
                                            className="size-4"
                                        />
                                        <span className="hidden sm:inline">
                                            {profileLabel}
                                        </span>
                                        <DropdownChevron isOpen={isMenuOpen} />
                                    </button>

                                    <AnchoredPopover
                                        align="right"
                                        anchorRef={menuRef}
                                        className="min-w-48"
                                        onClose={() => {
                                            setIsMenuOpen(false);
                                        }}
                                        open={isMenuOpen}
                                    >
                                        <MenuPanel>
                                            {showStaffPortal ? (
                                                <MenuLinkItem
                                                    onClick={() => {
                                                        setIsMenuOpen(false);
                                                    }}
                                                    to="/admin"
                                                >
                                                    <FaShieldHalved
                                                        aria-hidden="true"
                                                        className="size-3.5"
                                                    />
                                                    <span>Staff portal</span>
                                                </MenuLinkItem>
                                            ) : null}
                                            <MenuLinkItem
                                                onClick={() => {
                                                    setIsMenuOpen(false);
                                                }}
                                                to="/account"
                                            >
                                                <FaIdBadge
                                                    aria-hidden="true"
                                                    className="size-3.5"
                                                />
                                                <span>Manage account</span>
                                            </MenuLinkItem>

                                            <MenuItem
                                                onClick={() => {
                                                    void handleSignOut();
                                                }}
                                                title="Log out"
                                                tone="danger"
                                            >
                                                <FaArrowRightFromBracket
                                                    aria-hidden="true"
                                                    className="size-3.5"
                                                />
                                                <span>Log out</span>
                                            </MenuItem>
                                        </MenuPanel>
                                    </AnchoredPopover>
                                </div>
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

                <div
                    className="absolute top-1/2 right-4 -translate-y-1/2 sm:right-6"
                    ref={themeMenuRef}
                >
                    <ThemeToggle
                        mode={mode}
                        onOpenChange={setIsThemeMenuOpen}
                        open={isThemeMenuOpen}
                        resolvedMode={resolvedMode}
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
                                icon={<FaSun aria-hidden="true" className="size-3.5" />}
                                label="Light"
                                onSelect={() => {
                                    setMode('light');
                                    setIsThemeMenuOpen(false);
                                }}
                            />
                            <ThemeMenuItem
                                active={mode === 'dark'}
                                icon={<FaMoon aria-hidden="true" className="size-3.5" />}
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
                                label={`System (${resolvedMode})`}
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

function ThemeToggle({
    mode,
    onOpenChange,
    open,
    resolvedMode,
}: {
    mode: 'dark' | 'light' | 'system';
    onOpenChange: (open: boolean) => void;
    open: boolean;
    resolvedMode: 'dark' | 'light';
}) {
    const label =
        mode === 'system'
            ? `Theme: system (${resolvedMode})`
            : `Theme: ${mode}`;

    return (
        <button
            aria-label={label}
            aria-expanded={open}
            className="inline-flex size-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            onClick={() => {
                onOpenChange(!open);
            }}
            title={label}
            type="button"
        >
            {mode === 'system' ? (
                <FaDisplay aria-hidden="true" className="size-4" />
            ) : mode === 'dark' ? (
                <FaMoon aria-hidden="true" className="size-4" />
            ) : (
                <FaSun aria-hidden="true" className="size-4" />
            )}
        </button>
    );
}

function ThemeMenuItem({
    active,
    icon,
    label,
    onSelect,
}: {
    active: boolean;
    icon: ReactNode;
    label: string;
    onSelect: () => void;
}) {
    return (
        <MenuItem
            className={active ? 'bg-slate-100 text-slate-900' : undefined}
            onClick={onSelect}
        >
            {icon}
            <span>{label}</span>
        </MenuItem>
    );
}
