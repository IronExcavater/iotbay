import type { ReactNode } from 'react';
import { FaDisplay, FaMoon, FaSun } from 'react-icons/fa6';

import { MenuItem } from '../overlay/MenuItems';

interface ThemeToggleProps {
    mode: 'dark' | 'light' | 'system';
    onOpenChange: (open: boolean) => void;
    open: boolean;
}

export function ThemeToggle({ mode, onOpenChange, open }: ThemeToggleProps) {
    const label = mode === 'system' ? 'Theme: system' : `Theme: ${mode}`;

    return (
        <button
            aria-expanded={open}
            aria-label={label}
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
            className={active ? 'bg-slate-100 text-slate-900' : undefined}
            onClick={onSelect}
        >
            {icon}
            <span>{label}</span>
        </MenuItem>
    );
}
