import { useState } from 'react';
import clsx from 'clsx';

interface SwitchProps {
    checked: boolean;
    disabled?: boolean;
    label: string;
    onChange: (checked: boolean) => void;
}

export function Switch({
    checked,
    disabled = false,
    label,
    onChange,
}: SwitchProps) {
    const [hasInteracted, setHasInteracted] = useState(false);

    return (
        <button
            aria-checked={checked}
            aria-label={label}
            className={clsx(
                'relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border-2 border-transparent outline-none',
                hasInteracted && 'transition-colors',
                checked ? 'bg-ui-900' : 'bg-ui-300',
                disabled
                    ? 'cursor-not-allowed opacity-50'
                    : 'focus-visible:ring-ui-900 cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2'
            )}
            disabled={disabled}
            onClick={() => {
                setHasInteracted(true);
                onChange(!checked);
            }}
            role="switch"
            type="button"
        >
            <span
                className={clsx(
                    'pointer-events-none block size-5 rounded-full bg-white shadow-sm',
                    hasInteracted && 'transition-transform',
                    checked ? 'translate-x-4' : 'translate-x-0'
                )}
            />
        </button>
    );
}
