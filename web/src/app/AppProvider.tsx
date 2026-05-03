import { RouterProvider } from 'react-router-dom';

import { router } from '@app/router';
import { ThemeProvider } from '@app/theme/ThemeProvider';
import { AuthProvider } from '@features/auth/AuthProvider';
import { CartProvider } from '@features/cart/CartProvider';
import { ToastProvider } from '@shared/ui/toast/ToastProvider';

export function AppProvider() {
    return (
        <ThemeProvider>
            <ToastProvider>
                <AuthProvider>
                    <CartProvider>
                        <RouterProvider router={router} />
                    </CartProvider>
                </AuthProvider>
            </ToastProvider>
        </ThemeProvider>
    );
}
