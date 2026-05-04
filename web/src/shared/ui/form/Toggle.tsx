import clsx from 'clsx';

interface ToggleProps {
    checked: boolean;
    disabled?: boolean;
    onChange: (checked: boolean) => void;
}

export function Toggle({ checked, disabled = false, onChange }: ToggleProps) {
    return (
        <button
            aria-checked={checked}
            className={clsx(
                'relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 outline-none',
                checked ? 'bg-ui-900' : 'bg-ui-300',
                disabled
                    ? 'cursor-not-allowed opacity-50'
                    : 'focus-visible:ring-ui-900 focus-visible:ring-2 focus-visible:ring-offset-2'
            )}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            role="switch"
            type="button"
        >
            <span
                className={clsx(
                    'pointer-events-none block size-5 rounded-full bg-white shadow-sm transition-transform duration-200',
                    checked ? 'translate-x-4' : 'translate-x-0'
                )}
            />
        </button>
    );
}
