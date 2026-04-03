import { createBrowserRouter } from 'react-router-dom';

import SiteLayout from '../layouts/SiteLayout';
import AccountPage from '../pages/AccountPage';
import AdminPage from '../pages/AdminPage';
import AuthPage from '../pages/AuthPage';
import ErrorPage from '../pages/ErrorPage';
import HomePage from '../pages/HomePage';
import NotFoundPage from '../pages/NotFoundPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import VerifyEmailPage from '../pages/VerifyEmailPage';

export const router = createBrowserRouter([
    {
        path: '/',
        element: <SiteLayout />,
        errorElement: <ErrorPage />,
        children: [
            {
                index: true,
                element: <HomePage />,
            },
            {
                path: 'auth',
                element: <AuthPage />,
            },
            {
                path: 'reset-password',
                element: <ResetPasswordPage />,
            },
            {
                path: 'verify-email',
                element: <VerifyEmailPage />,
            },
            {
                path: 'account',
                element: <AccountPage />,
            },
            {
                path: 'admin',
                element: <AdminPage />,
            },
            {
                path: '*',
                element: <NotFoundPage />,
            },
        ],
    },
]);
