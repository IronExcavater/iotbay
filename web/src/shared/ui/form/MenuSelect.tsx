import { useEffect, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';

import { useSearchFilter } from '@shared/hooks/useSearchFilter';
import { DropdownChevron } from '@shared/ui/form/DropdownChevron';
import { DropdownSearchInput } from '@shared/ui/form/DropdownSearchInput';
import { Field } from '@shared/ui/form/Field';
import { AnchoredPopover } from '@shared/ui/overlay/AnchoredPopover';
import { MenuPanel } from '@shared/ui/overlay/MenuItems';

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
                        'h-10 w-full rounded border-0 px-3 ring-1 transition-[background-color,box-shadow,color] outline-none',
                        error
                            ? 'ring-red-500 focus:ring-2 focus:ring-red-500'
                            : 'ring-ui-300 focus:ring-ui-900 focus:ring-2',
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
                            selectedOption ? 'text-ui-900' : 'text-ui-500'
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
                        {searchable && (
                            <div>
                                <DropdownSearchInput
                                    inputRef={searchInputRef}
                                    onChange={setSearch}
                                    placeholder="Search options"
                                    value={search}
                                />
                            </div>
                        )}

                        <div className="max-h-64 overflow-y-auto" tabIndex={-1}>
                            {filteredOptions.map((option) => (
                                <button
                                    className={clsx(
                                        'text-ui-700 hover:bg-ui-100 hover:text-ui-900 focus-visible:ring-ui-900 flex w-full cursor-pointer items-start justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition outline-none focus-visible:ring-2 focus-visible:ring-inset',
                                        option.value === value && 'bg-ui-50'
                                    )}
                                    key={option.value}
                                    onClick={() => {
                                        setIsOpen(false);
                                        onChange(option.value);
                                    }}
                                    type="button"
                                >
                                    <span className="grid gap-0.5">
                                        <span className="text-ui-900">
                                            {option.label}
                                        </span>
                                        {option.description && (
                                            <span className="text-ui-500">
                                                {option.description}
                                            </span>
                                        )}
                                    </span>
                                </button>
                            ))}

                            {filteredOptions.length === 0 && (
                                <div className="text-ui-500 px-3 py-2 text-sm">
                                    No matches
                                </div>
                            )}
                        </div>
                    </MenuPanel>
                </AnchoredPopover>
            </div>
        </Field>
    );
}
