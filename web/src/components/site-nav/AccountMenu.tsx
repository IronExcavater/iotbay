import type React from 'react';
import {
    FaArrowRightFromBracket,
    FaIdBadge,
    FaShieldHalved,
    FaUser,
} from 'react-icons/fa6';

import { DropdownChevron } from '../form/DropdownChevron';
import { AnchoredPopover } from '../overlay/AnchoredPopover';
import { MenuItem, MenuLinkItem, MenuPanel } from '../overlay/MenuItems';

interface AccountMenuProps {
    menuLabel: string;
    menuRef: React.RefObject<HTMLDivElement | null>;
    onClose: () => void;
    onSignOut: () => void;
    onToggle: () => void;
    open: boolean;
    profileLabel: string;
    showStaffPortal: boolean;
}

export function AccountMenu({
    menuLabel,
    menuRef,
    onClose,
    onSignOut,
    onToggle,
    open,
    profileLabel,
    showStaffPortal,
}: AccountMenuProps) {
    return (
        <div className="relative" ref={menuRef}>
            <button
                aria-label={menuLabel}
                className="flex items-center gap-2 rounded border border-slate-300 px-3 py-2 text-slate-700 hover:bg-slate-100"
                onClick={onToggle}
                title={menuLabel}
                type="button"
            >
                <FaUser aria-hidden="true" className="size-4" />
                <span className="hidden sm:inline">{profileLabel}</span>
                <DropdownChevron isOpen={open} />
            </button>

            <AnchoredPopover
                align="right"
                anchorRef={menuRef}
                className="min-w-48"
                onClose={onClose}
                open={open}
            >
                <MenuPanel>
                    {showStaffPortal ? (
                        <MenuLinkItem onClick={onClose} to="/admin">
                            <FaShieldHalved
                                aria-hidden="true"
                                className="size-3.5"
                            />
                            <span>Staff portal</span>
                        </MenuLinkItem>
                    ) : null}
                    <MenuLinkItem onClick={onClose} to="/account">
                        <FaIdBadge aria-hidden="true" className="size-3.5" />
                        <span>Manage account</span>
                    </MenuLinkItem>

                    <MenuItem onClick={onSignOut} title="Log out" tone="danger">
                        <FaArrowRightFromBracket
                            aria-hidden="true"
                            className="size-3.5"
                        />
                        <span>Log out</span>
                    </MenuItem>
                </MenuPanel>
            </AnchoredPopover>
        </div>
    );
}
