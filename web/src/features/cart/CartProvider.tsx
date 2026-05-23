import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react';

import { useAuth } from '@features/auth/AuthProvider';
import { cartApi, type CartItem as ApiCartItem } from '@features/cart/api';

export interface CartItem {
    code?: string;
    imageUrl?: string;
    name: string;
    priceCents: number;
    productId: string;
    quantity: number;
}

interface CartContextValue {
    addToCart: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
    clearCart: () => void;
    getQuantity: (productId: string) => number;
    isInCart: (productId: string) => boolean;
    items: CartItem[];
    removeFromCart: (productId: string) => void;
    setItemQuantity: (productId: string, quantity: number) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function apiItemToCartItem(item: ApiCartItem): CartItem {
    return {
        productId: item.productId,
        name: item.name,
        code: item.code,
        priceCents: item.priceCents,
        imageUrl: item.imageUrl,
        quantity: item.quantity,
    };
}

export function CartProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const isCustomer = user?.userType === 'customer';

    const [items, setItems] = useState<CartItem[]>([]);

    useEffect(() => {
        if (!isCustomer) {
            setItems([]);
            return;
        }
        const controller = new AbortController();
        cartApi
            .get(controller.signal)
            .then((cart) => setItems(cart.items.map(apiItemToCartItem)))
            .catch(() => {});
        return () => controller.abort();
    }, [isCustomer]);

    const addToCart = useCallback(
        (item: Omit<CartItem, 'quantity'>, quantity = 1) => {
            const nextQuantity = Math.max(1, Math.floor(quantity));
            if (!isCustomer) {
                setItems((current) => {
                    const existingItem = current.find(
                        (i) => i.productId === item.productId
                    );
                    if (!existingItem) {
                        return [
                            ...current,
                            { ...item, quantity: nextQuantity },
                        ];
                    }

                    return current.map((cartItem) =>
                        cartItem.productId === item.productId
                            ? {
                                  ...cartItem,
                                  quantity: cartItem.quantity + nextQuantity,
                              }
                            : cartItem
                    );
                });
                return;
            }
            const currentQuantity =
                items.find((i) => i.productId === item.productId)?.quantity ??
                0;
            cartApi
                .addItem({
                    productId: item.productId,
                    quantity: currentQuantity + nextQuantity,
                })
                .then((cart) => setItems(cart.items.map(apiItemToCartItem)))
                .catch(() => {});
        },
        [isCustomer, items]
    );

    const removeFromCart = useCallback(
        (productId: string) => {
            if (!isCustomer) {
                setItems((current) =>
                    current.filter((i) => i.productId !== productId)
                );
                return;
            }
            cartApi
                .removeItem(productId)
                .then((cart) => setItems(cart.items.map(apiItemToCartItem)))
                .catch(() => {});
        },
        [isCustomer]
    );

    const setItemQuantity = useCallback(
        (productId: string, quantity: number) => {
            const nextQuantity = Math.max(0, Math.floor(quantity));
            if (nextQuantity === 0) {
                removeFromCart(productId);
                return;
            }

            if (!isCustomer) {
                setItems((current) =>
                    current.map((item) =>
                        item.productId === productId
                            ? { ...item, quantity: nextQuantity }
                            : item
                    )
                );
                return;
            }

            cartApi
                .addItem({ productId, quantity: nextQuantity })
                .then((cart) => setItems(cart.items.map(apiItemToCartItem)))
                .catch(() => {});
        },
        [isCustomer, removeFromCart]
    );

    const clearCart = useCallback(() => {
        if (!isCustomer) {
            setItems([]);
            return;
        }
        cartApi
            .clearItems()
            .then((cart) => setItems(cart.items.map(apiItemToCartItem)))
            .catch(() => {});
    }, [isCustomer]);

    function isInCart(productId: string) {
        return items.some((i) => i.productId === productId);
    }

    function getQuantity(productId: string) {
        return items.find((i) => i.productId === productId)?.quantity ?? 0;
    }

    return (
        <CartContext.Provider
            value={{
                addToCart,
                clearCart,
                getQuantity,
                isInCart,
                items,
                removeFromCart,
                setItemQuantity,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart must be used within CartProvider');
    return context;
}
