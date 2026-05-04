import type React from 'react';
import clsx from 'clsx';
import {
    FaArrowRightFromBracket,
    FaIdBadge,
    FaShieldHalved,
} from 'react-icons/fa6';

import { Avatar } from '@shared/ui/Avatar';
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
    profileImageUrl?: string | null;
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
    profileImageUrl,
    profileLabel,
    showStaffPortal,
}: AccountMenuProps) {
    return (
        <div className="relative" ref={menuRef}>
            <button
                aria-label={menuLabel}
                className={clsx(
                    'group text-ui-700 focus-visible:ring-ui-900 flex items-center gap-1.5 rounded p-0.5 transition-[box-shadow,color] outline-none focus-visible:ring-2'
                )}
                onClick={onToggle}
                type="button"
            >
                <span className="group-hover:bg-ui-100 group-focus-visible:bg-ui-100 flex items-center gap-2 rounded py-1 pr-2 pl-1 transition-colors">
                    <Avatar
                        imageUrl={profileImageUrl}
                        name={profileLabel}
                        size="sm"
                    />
                    <span className="hidden sm:inline">{profileLabel}</span>
                </span>
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
                        <span>Account</span>
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
