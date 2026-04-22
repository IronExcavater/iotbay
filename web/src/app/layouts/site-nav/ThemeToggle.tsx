import type { ReactNode } from 'react';
import clsx from 'clsx';
import { FaDisplay, FaMoon, FaSun } from 'react-icons/fa6';

import { MenuItem } from '@shared/ui/overlay/MenuItems';
import { Tooltip } from '@shared/ui/Tooltip';

interface ThemeToggleProps {
    mode: 'dark' | 'light' | 'system';
    onOpenChange: (open: boolean) => void;
    open: boolean;
}

export function ThemeToggle({ mode, onOpenChange, open }: ThemeToggleProps) {
    const label = `Theme set to ${mode}`;

    return (
        <Tooltip label={label}>
            <button
                aria-expanded={open}
                aria-label={label}
                className={clsx(
                    'text-ui-500 hover:bg-ui-100 hover:text-ui-900 focus-visible:ring-ui-900 inline-flex size-10 items-center justify-center rounded-full transition-[background-color,box-shadow,color] outline-none focus-visible:ring-2 focus-visible:ring-inset'
                )}
                onClick={() => {
                    onOpenChange(!open);
                }}
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
        </Tooltip>
    );
}

interface ThemeMenuItemProps {
    active: boolean;
    icon: ReactNode;
    label: string;
    onSelect: () => void;
}

export function ThemeMenuItem({
    active,
    icon,
    label,
    onSelect,
}: ThemeMenuItemProps) {
    return (
        <MenuItem
            className={active ? 'bg-ui-100 text-ui-900' : undefined}
            onClick={onSelect}
        >
            {icon}
            <span>{label}</span>
        </MenuItem>
    );
}
