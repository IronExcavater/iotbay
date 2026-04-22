import { RouterProvider } from 'react-router-dom';

import { router } from '@app/router';
import { ThemeProvider } from '@app/theme/ThemeProvider';
import { AuthProvider } from '@features/auth/AuthProvider';
import { ToastProvider } from '@shared/ui/toast/ToastProvider';

export function AppProvider() {
    return (
        <ThemeProvider>
            <ToastProvider>
                <AuthProvider>
                    <RouterProvider router={router} />
                </AuthProvider>
            </ToastProvider>
        </ThemeProvider>
    );
}
