import { createContext, useContext, useState, type ReactNode } from 'react';

export interface CartItem {
    name: string;
    priceCents: number;
    productId: string;
}

interface CartContextValue {
    addToCart: (item: CartItem) => void;
    isInCart: (productId: string) => boolean;
    items: CartItem[];
    removeFromCart: (productId: string) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);

    function addToCart(item: CartItem) {
        setItems((current) => {
            if (current.some((i) => i.productId === item.productId))
                return current;
            return [...current, item];
        });
    }

    function isInCart(productId: string) {
        return items.some((i) => i.productId === productId);
    }

    function removeFromCart(productId: string) {
        setItems((current) => current.filter((i) => i.productId !== productId));
    }

    return (
        <CartContext.Provider
            value={{ addToCart, isInCart, items, removeFromCart }}
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
