import { FaMinus, FaPlus } from 'react-icons/fa6';

import { useCart, type CartItem } from '@features/cart/CartProvider';

const MAX_QUANTITY = 99;

export function AddToCartControl({
    item,
    stock,
}: {
    item: Omit<CartItem, 'quantity'>;
    stock: number;
}) {
    const { addToCart, getQuantity, removeFromCart, setItemQuantity } =
        useCart();
    const cartQuantity = getQuantity(item.productId);

    if (stock <= 0) {
        return (
            <span className="text-ui-400 text-sm font-medium">
                Out of stock
            </span>
        );
    }

    const max = Math.min(stock, MAX_QUANTITY);

    if (cartQuantity > 0) {
        return (
            <div className="bg-ui-950 inline-flex h-9 items-center overflow-hidden rounded">
                <button
                    aria-label={`Remove one ${item.name} from cart`}
                    className="text-ui-0 hover:bg-ui-800 flex h-full w-9 shrink-0 items-center justify-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-inset"
                    onClick={() => {
                        if (cartQuantity <= 1) {
                            removeFromCart(item.productId);
                        } else {
                            setItemQuantity(item.productId, cartQuantity - 1);
                        }
                    }}
                    type="button"
                >
                    <FaMinus aria-hidden="true" className="size-2.5" />
                </button>
                <span className="text-ui-0 flex min-w-8 items-center justify-center border-x border-white/20 px-2 text-sm font-semibold tabular-nums">
                    {cartQuantity}
                </span>
                <button
                    aria-label={`Add one more ${item.name} to cart`}
                    className="text-ui-0 hover:bg-ui-800 disabled:text-ui-0/30 flex h-full w-9 shrink-0 items-center justify-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-inset disabled:cursor-not-allowed"
                    disabled={cartQuantity >= max}
                    onClick={() =>
                        setItemQuantity(item.productId, cartQuantity + 1)
                    }
                    type="button"
                >
                    <FaPlus aria-hidden="true" className="size-2.5" />
                </button>
            </div>
        );
    }

    return (
        <button
            className="bg-ui-950 hover:bg-ui-800 text-ui-0 focus-visible:ring-ui-900 inline-flex h-9 items-center gap-1.5 rounded px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2"
            onClick={() => addToCart(item, 1)}
            type="button"
        >
            <FaPlus aria-hidden="true" className="size-2.5" />
            Add to cart
        </button>
    );
}
