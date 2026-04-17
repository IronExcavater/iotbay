import { useEffect, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';

import { useSearchFilter } from '../../hooks/useSearchFilter';
import { AnchoredPopover } from '../overlay/AnchoredPopover';
import { MenuPanel } from '../overlay/MenuItems';
import { DropdownChevron } from './DropdownChevron';
import { DropdownSearchInput } from './DropdownSearchInput';
import { Field } from './Field';

export interface MenuSelectOption {
    description?: string;
    label: string;
    value: string;
}

interface MenuSelectProps {
    error?: string;
    label: ReactNode;
    onChange: (value: string) => void;
    options: MenuSelectOption[];
    placeholder?: string;
    required?: boolean;
    searchable?: boolean;
    value: string;
}

export function MenuSelect({
    error,
    label,
    onChange,
    options,
    placeholder = 'Select option',
    required = false,
    searchable = false,
    value,
}: MenuSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const rootRef = useRef<HTMLDivElement | null>(null);
    const searchInputRef = useRef<HTMLInputElement | null>(null);

    const selectedOption =
        options.find((option) => option.value === value) ?? null;

    const filteredOptions = useSearchFilter(options, search, (option) => [
        option.label,
        option.description ?? '',
        option.value,
    ]);

    useEffect(() => {
        if (!isOpen) {
            setSearch('');
            return;
        }

        if (searchable) {
            searchInputRef.current?.focus();
        }
    }, [isOpen, searchable]);

    return (
        <Field error={error} label={label} required={required}>
            <div className="relative" ref={rootRef}>
                <button
                    className={clsx(
                        'w-full rounded border px-3 py-2',
                        error ? 'border-red-500' : 'border-slate-300',
                        'flex cursor-pointer items-center justify-between gap-3 text-left'
                    )}
                    onClick={() => {
                        setIsOpen((current) => !current);
                    }}
                    type="button"
                >
                    <span
                        className={clsx(
                            'truncate text-sm',
                            selectedOption ? 'text-slate-900' : 'text-slate-500'
                        )}
                    >
                        {selectedOption?.label ?? placeholder}
                    </span>

                    <DropdownChevron className="shrink-0" isOpen={isOpen} />
                </button>

                <AnchoredPopover
                    anchorRef={rootRef}
                    matchAnchorWidth
                    onClose={() => {
                        setIsOpen(false);
                    }}
                    open={isOpen}
                >
                    <MenuPanel>
                        {searchable ? (
                            <div className="border-b border-slate-200 pb-2">
                                <DropdownSearchInput
                                    inputRef={searchInputRef}
                                    onChange={setSearch}
                                    placeholder="Search options"
                                    value={search}
                                />
                            </div>
                        ) : null}

                        <div className="max-h-64 overflow-y-auto">
                            {filteredOptions.map((option) => (
                                <button
                                    className={clsx(
                                        'inline-flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 hover:text-slate-900',
                                        'flex cursor-pointer items-start justify-between gap-3',
                                        option.value === value && 'bg-slate-50'
                                    )}
                                    key={option.value}
                                    onClick={() => {
                                        setIsOpen(false);
                                        onChange(option.value);
                                    }}
                                    type="button"
                                >
                                    <span className="grid gap-0.5">
                                        <span className="text-slate-900">
                                            {option.label}
                                        </span>
                                        {option.description ? (
                                            <span className="text-slate-500">
                                                {option.description}
                                            </span>
                                        ) : null}
                                    </span>
                                </button>
                            ))}

                            {filteredOptions.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-slate-500">
                                    No matches
                                </div>
                            ) : null}
                        </div>
                    </MenuPanel>
                </AnchoredPopover>
            </div>
        </Field>
    );
}
