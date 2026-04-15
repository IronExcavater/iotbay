import type { ChangeEventHandler, Ref } from 'react';

import { Field } from './Field';
import { Input } from './Input';

interface MoneyFieldProps {
    error?: string;
    hint?: string;
    inputRef?: Ref<HTMLInputElement>;
    label: string;
    onChange: ChangeEventHandler<HTMLInputElement>;
    placeholder?: string;
    required?: boolean;
    value: string;
}

export function MoneyField({
    error,
    hint,
    inputRef,
    label,
    onChange,
    placeholder = '0.00',
    required = false,
    value,
}: MoneyFieldProps) {
    return (
        <Field error={error} hint={hint} label={label} required={required}>
            <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-500">
                    A$
                </span>

                <Input
                    className="pl-10"
                    hasError={Boolean(error)}
                    inputMode="decimal"
                    onChange={onChange}
                    placeholder={placeholder}
                    ref={inputRef}
                    value={value}
                />
            </div>
        </Field>
    );
}
