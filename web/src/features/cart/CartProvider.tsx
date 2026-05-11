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
    addToCart: (item: CartItem) => void;
    clearCart: () => void;
    isInCart: (productId: string) => boolean;
    items: CartItem[];
    removeFromCart: (productId: string) => void;
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
        (item: CartItem) => {
            if (!isCustomer) {
                setItems((current) => {
                    if (current.some((i) => i.productId === item.productId))
                        return current;
                    return [...current, item];
                });
                return;
            }
            cartApi
                .addItem({ productId: item.productId, quantity: 1 })
                .then((cart) => setItems(cart.items.map(apiItemToCartItem)))
                .catch(() => {});
        },
        [isCustomer]
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

    return (
        <CartContext.Provider
            value={{ addToCart, clearCart, isInCart, items, removeFromCart }}
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
