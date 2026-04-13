import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import { AuthProvider } from './auth/AuthProvider';
import { ToastProvider } from './components/toast/ToastProvider';
import { router } from './routes/router';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <ToastProvider>
        <AuthProvider>
            <RouterProvider router={router} />
        </AuthProvider>
    </ToastProvider>
);
