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
                    'group text-ui-700 flex h-10 items-center gap-1.5 rounded outline-none'
                )}
                onClick={onToggle}
                type="button"
            >
                <span className="group-hover:text-ui-900 group-focus-visible:text-ui-900 flex min-w-0 items-center gap-2 rounded py-1 pr-1 pl-1 transition-colors">
                    <Avatar
                        className="group-hover:ring-ui-400 group-focus-visible:ring-ui-900 transition-shadow group-focus-visible:ring-2"
                        imageUrl={profileImageUrl}
                        name={profileLabel}
                        size="sm"
                    />
                    <span className="hidden sm:inline">{profileLabel}</span>
                </span>
                <DropdownChevron
                    className="group-hover:text-ui-900 group-focus-visible:text-ui-900 shrink-0 transition-colors"
                    isOpen={open}
                />
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
