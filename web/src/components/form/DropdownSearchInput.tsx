import type { Ref } from 'react';
import { FaMagnifyingGlass } from 'react-icons/fa6';

import { Input } from './Input';

export function DropdownSearchInput({
    inputRef,
    onChange,
    placeholder,
    value,
}: {
    inputRef?: Ref<HTMLInputElement>;
    onChange: (value: string) => void;
    placeholder: string;
    value: string;
}) {
    return (
        <div className="relative">
            <span className="text-ui-400 pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <FaMagnifyingGlass aria-hidden="true" size={14} />
            </span>

            <Input
                className="pl-8"
                inputSize="compact"
                onChange={(event) => {
                    onChange(event.target.value);
                }}
                placeholder={placeholder}
                ref={inputRef}
                value={value}
            />
        </div>
    );
}
