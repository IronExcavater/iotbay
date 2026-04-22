import { useRef } from 'react';
import clsx from 'clsx';
import { FaMagnifyingGlass } from 'react-icons/fa6';

import { Input } from '@shared/ui/form/Input';

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
                className="pr-11"
                onChange={(event) => {
                    onChange(event.target.value);
                }}
                placeholder={placeholder}
                ref={inputRef}
                value={value}
            />

            <button
                aria-label="Focus search"
                className={clsx(
                    'text-ui-500 hover:text-ui-900 focus-visible:ring-ui-900 absolute top-1/2 right-1.5 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full transition outline-none focus-visible:ring-2 focus-visible:ring-inset'
                )}
                onClick={() => {
                    inputRef.current?.focus();
                }}
                type="button"
            >
                <FaMagnifyingGlass aria-hidden="true" className="size-4" />
            </button>
        </div>
    );
}
