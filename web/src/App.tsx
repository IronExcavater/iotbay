import { RouterProvider } from 'react-router-dom';

import { AuthProvider } from './auth/AuthProvider';
import { ToastProvider } from './components/toast/ToastProvider';
import { router } from './routes/router';

export default function App() {
    return (
        <ToastProvider>
            <AuthProvider>
                <RouterProvider router={router} />
            </AuthProvider>
        </ToastProvider>
    );
}
