import { createBrowserRouter } from 'react-router-dom';

import { ProtectedRoute } from '../auth/ProtectedRoute';
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
                element: <ProtectedRoute access="guest" />,
                children: [
                    {
                        path: 'sign-in',
                        element: <AuthPage mode="signin" />,
                    },
                    {
                        path: 'sign-up',
                        element: <AuthPage mode="signup" />,
                    },
                    {
                        path: 'staff/sign-in',
                        element: <AuthPage mode="staff" />,
                    },
                    {
                        path: 'forgot-password',
                        element: <ResetPasswordPage />,
                    },
                    {
                        path: 'reset-password',
                        element: <ResetPasswordPage />,
                    },
                    {
                        path: 'verify-email',
                        element: <VerifyEmailPage />,
                    },
                ],
            },
            {
                element: <ProtectedRoute />,
                children: [
                    {
                        path: 'account',
                        element: <AccountPage />,
                    },
                ],
            },
            {
                element: <ProtectedRoute access="staff" />,
                children: [
                    {
                        path: 'admin',
                        element: <AdminPage />,
                    },
                ],
            },
            {
                path: '*',
                element: <NotFoundPage />,
            },
        ],
    },
]);
