import { useRef, useState } from 'react';
import type { IconType } from 'react-icons';
import { FaEllipsis } from 'react-icons/fa6';

import { Button } from '@shared/ui/form/Button';
import { AnchoredPopover } from '@shared/ui/overlay/AnchoredPopover';
import { MenuPanel, MenuItem } from '@shared/ui/overlay/MenuItems';

interface ActionMenuItem {
    disabled?: boolean;
    icon: IconType;
    label: string;
    onSelect: () => void;
    tone?: 'danger' | 'default';
}

export function ActionMenu({
    items,
    label = 'Open actions',
}: {
    items: ActionMenuItem[];
    label?: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement | null>(null);

    return (
        <>
            <Button
                aria-label={label}
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-full p-0"
                onClick={() => {
                    setIsOpen((current) => !current);
                }}
                ref={buttonRef}
                type="button"
                variant="ghost"
            >
                <FaEllipsis aria-hidden="true" className="size-3.5" />
            </Button>

            <AnchoredPopover
                align="right"
                anchorRef={buttonRef}
                className="min-w-40"
                onClose={() => {
                    setIsOpen(false);
                }}
                open={isOpen}
            >
                <MenuPanel>
                    {items.map((item) => {
                        const Icon = item.icon;

                        return (
                            <MenuItem
                                disabled={item.disabled}
                                key={item.label}
                                onClick={() => {
                                    setIsOpen(false);
                                    item.onSelect();
                                }}
                                tone={item.tone}
                            >
                                <Icon
                                    aria-hidden="true"
                                    className="size-3.5 shrink-0"
                                />
                                <span>{item.label}</span>
                            </MenuItem>
                        );
                    })}
                </MenuPanel>
            </AnchoredPopover>
        </>
    );
}
