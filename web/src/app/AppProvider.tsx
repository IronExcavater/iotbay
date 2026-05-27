import { RouterProvider } from 'react-router-dom';

import { router } from '@app/router';
import { ThemeProvider } from '@app/theme/ThemeProvider';
import { AuthProvider } from '@features/auth/AuthProvider';
import { CartProvider } from '@features/cart/CartProvider';
import { ToastProvider } from '@shared/ui/toast/ToastProvider';
import { useDemo } from '../demo/DemoContext';
import { DemoOverlay } from '../demo/DemoOverlay';

const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

function AppWithDemo() {
    const { status } = useDemo();
    const ready = status.stage === 'READY';

    return (
        <ThemeProvider>
            <ToastProvider>
                <AuthProvider>
                    <CartProvider>
                        {ready && <RouterProvider router={router} />}
                        <DemoOverlay />
                    </CartProvider>
                </AuthProvider>
            </ToastProvider>
        </ThemeProvider>
    );
}

function AppStandalone() {
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

export function AppProvider() {
    return isDemoMode ? <AppWithDemo /> : <AppStandalone />;
}
