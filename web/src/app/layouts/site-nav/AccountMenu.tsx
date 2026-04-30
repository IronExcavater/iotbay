import type React from 'react';
import clsx from 'clsx';
import {
    FaArrowRightFromBracket,
    FaIdBadge,
    FaShieldHalved,
    FaUser,
} from 'react-icons/fa6';

import { DropdownChevron } from '@shared/ui/form/DropdownChevron';
import { AnchoredPopover } from '@shared/ui/overlay/AnchoredPopover';
import {
    MenuItem,
    MenuLinkItem,
    MenuPanel,
} from '@shared/ui/overlay/MenuItems';

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
                className={clsx(
                    'text-ui-700 hover:bg-ui-100 ring-ui-400 focus-visible:ring-ui-900 flex items-center gap-2 rounded px-3 py-2 ring-1 transition-[background-color,box-shadow,color] outline-none focus-visible:ring-2'
                )}
                onClick={onToggle}
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
                zIndex={40}
            >
                <MenuPanel>
                    {showStaffPortal && (
                        <MenuLinkItem onClick={onClose} to="/admin">
                            <FaShieldHalved
                                aria-hidden="true"
                                className="size-3.5"
                            />
                            <span>Staff portal</span>
                        </MenuLinkItem>
                    )}
                    <MenuLinkItem onClick={onClose} to="/account">
                        <FaIdBadge aria-hidden="true" className="size-3.5" />
                        <span>Manage account</span>
                    </MenuLinkItem>

                    <MenuItem onClick={onSignOut} tone="danger">
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
