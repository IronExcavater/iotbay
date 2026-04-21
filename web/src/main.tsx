import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import { AuthProvider } from './auth/AuthProvider';
import { ToastProvider } from './components/toast/ToastProvider';
import { router } from './routes/router';
import { ThemeProvider } from './theme/ThemeProvider';
import './styles/tokens.scss';
import './styles/index.css';
import './theme/theme.scss';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <ThemeProvider>
        <ToastProvider>
            <AuthProvider>
                <RouterProvider router={router} />
            </AuthProvider>
        </ToastProvider>
    </ThemeProvider>
);
