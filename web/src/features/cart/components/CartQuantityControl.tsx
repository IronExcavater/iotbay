import { FaMinus, FaPlus } from 'react-icons/fa6';

const MAX_CART_QUANTITY = 99;

export function CartQuantityControl({
    disabled = false,
    label,
    onChange,
    value,
}: {
    disabled?: boolean;
    label: string;
    onChange: (quantity: number) => void;
    value: number;
}) {
    function commit(next: number) {
        onChange(clampQuantity(next));
    }

    return (
        <div className="bg-ui-950 inline-flex h-9 items-center overflow-hidden rounded">
            <button
                aria-label={`Decrease ${label} quantity`}
                className="text-ui-0 hover:bg-ui-800 disabled:text-ui-0/30 flex h-full w-9 shrink-0 items-center justify-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-inset disabled:cursor-not-allowed"
                disabled={disabled || value <= 1}
                onClick={() => commit(value - 1)}
                type="button"
            >
                <FaMinus aria-hidden="true" className="size-2.5" />
            </button>
            <span className="text-ui-0 flex min-w-8 items-center justify-center border-x border-white/20 px-2 text-sm font-semibold tabular-nums">
                {value}
            </span>
            <button
                aria-label={`Increase ${label} quantity`}
                className="text-ui-0 hover:bg-ui-800 disabled:text-ui-0/30 flex h-full w-9 shrink-0 items-center justify-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-inset disabled:cursor-not-allowed"
                disabled={disabled || value >= MAX_CART_QUANTITY}
                onClick={() => commit(value + 1)}
                type="button"
            >
                <FaPlus aria-hidden="true" className="size-2.5" />
            </button>
        </div>
    );
}

export function clampQuantity(value: number) {
    if (!Number.isFinite(value)) return 1;
    return Math.min(MAX_CART_QUANTITY, Math.max(1, Math.floor(value)));
}
