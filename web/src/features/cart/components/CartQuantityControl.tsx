import { FaMinus, FaPlus } from 'react-icons/fa6';

import { Button } from '@shared/ui/form/Button';
import { Input } from '@shared/ui/form/Input';

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
    function commitQuantity(nextValue: number) {
        onChange(clampQuantity(nextValue));
    }

    return (
        <div className="ring-ui-300 flex w-fit items-center rounded ring-1">
            <Button
                aria-label={`Decrease ${label} quantity`}
                className="size-9 rounded-r-none p-0 ring-0 focus-visible:ring-2"
                disabled={disabled || value <= 1}
                onClick={() => commitQuantity(value - 1)}
                type="button"
                variant="ghost"
            >
                <FaMinus aria-hidden="true" className="size-3" />
            </Button>
            <Input
                aria-label={`${label} quantity`}
                className="h-9 w-12 rounded-none text-center ring-0 focus:ring-0"
                disabled={disabled}
                inputMode="numeric"
                max={MAX_CART_QUANTITY}
                min={1}
                onBlur={(event) => {
                    commitQuantity(Number(event.target.value));
                }}
                onChange={(event) => {
                    const digits = event.target.value.replace(/\D/g, '');
                    if (!digits) {
                        onChange(1);
                        return;
                    }
                    commitQuantity(Number(digits));
                }}
                type="text"
                value={String(value)}
            />
            <Button
                aria-label={`Increase ${label} quantity`}
                className="size-9 rounded-l-none p-0 ring-0 focus-visible:ring-2"
                disabled={disabled || value >= MAX_CART_QUANTITY}
                onClick={() => commitQuantity(value + 1)}
                type="button"
                variant="ghost"
            >
                <FaPlus aria-hidden="true" className="size-3" />
            </Button>
        </div>
    );
}

export function clampQuantity(value: number) {
    if (!Number.isFinite(value)) return 1;
    return Math.min(MAX_CART_QUANTITY, Math.max(1, Math.floor(value)));
}
