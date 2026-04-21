import { useRef } from 'react';
import clsx from 'clsx';
import { FaMagnifyingGlass } from 'react-icons/fa6';

import { Tooltip } from '../ui/Tooltip';
import { Input } from './Input';

export function SearchInput({
    className,
    onChange,
    placeholder,
    value,
}: {
    className?: string;
    onChange: (value: string) => void;
    placeholder: string;
    value: string;
}) {
    const inputRef = useRef<HTMLInputElement | null>(null);

    return (
        <div className={clsx('relative w-full', className)}>
            <Input
                className="pr-12"
                onChange={(event) => {
                    onChange(event.target.value);
                }}
                placeholder={placeholder}
                ref={inputRef}
                value={value}
            />

            <Tooltip
                className="absolute inset-y-0 right-0"
                label="Focus search"
            >
                <button
                    aria-label="Focus search"
                    className="inline-flex h-full w-11 items-center justify-center rounded-r border-l border-transparent text-slate-500 transition hover:text-slate-900"
                    onClick={() => {
                        inputRef.current?.focus();
                    }}
                    type="button"
                >
                    <FaMagnifyingGlass aria-hidden="true" className="size-4" />
                </button>
            </Tooltip>
        </div>
    );
}
