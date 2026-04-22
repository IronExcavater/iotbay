import { createBrowserRouter, Navigate } from 'react-router-dom';

import ErrorPage from '@app/ErrorPage';
import AdminLayout from '@app/layouts/AdminLayout';
import SiteLayout from '@app/layouts/SiteLayout';
import NotFoundPage from '@app/NotFoundPage';
import AccountPage from '@features/account/AccountPage';
import AuthPage from '@features/auth/pages/AuthPage';
import ResetPasswordPage from '@features/auth/pages/ResetPasswordPage';
import StaffRegistrationPage from '@features/auth/pages/StaffRegistrationPage';
import VerifyEmailPage from '@features/auth/pages/VerifyEmailPage';
import { ProtectedRoute } from '@features/auth/ProtectedRoute';
import AdminProductsPage from '@features/products/admin/AdminProductsPage';
import ProductCatalogPage from '@features/products/ProductCatalogPage';
import AdminUsersPage from '@features/users/admin/AdminUsersPage';
import InviteStaffPage from '@features/users/admin/InviteStaffPage';

export const router = createBrowserRouter([
    {
        path: '/',
        element: <SiteLayout />,
        errorElement: <ErrorPage />,
        children: [
            {
                index: true,
                element: <ProductCatalogPage />,
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
                        element: <AdminLayout />,
                        children: [
                            {
                                index: true,
                                element: (
                                    <Navigate replace to="/admin/products" />
                                ),
                            },
                            {
                                path: 'products',
                                element: <AdminProductsPage />,
                            },
                            {
                                element: <ProtectedRoute access="superadmin" />,
                                children: [
                                    {
                                        path: 'users',
                                        element: <AdminUsersPage />,
                                        children: [
                                            {
                                                path: 'invite-staff',
                                                element: <InviteStaffPage />,
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                path: 'admin/invite-staff',
                element: <Navigate replace to="/admin/users/invite-staff" />,
            },
            {
                path: 'staff-register',
                element: <StaffRegistrationPage />,
            },
            {
                path: '*',
                element: <NotFoundPage />,
            },
        ],
    },
]);
