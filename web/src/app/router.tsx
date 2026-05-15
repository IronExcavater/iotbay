import { createBrowserRouter, Navigate } from 'react-router-dom';

import ErrorPage from '@app/ErrorPage';
import AdminLayout from '@app/layouts/AdminLayout';
import SiteLayout from '@app/layouts/SiteLayout';
import NotFoundPage from '@app/NotFoundPage';
import AdminAccessLogsPage from '@features/access-logs/admin/AdminAccessLogsPage';
import { ProtectedRoute } from '@features/auth/components/ProtectedRoute';
import AuthPage from '@features/auth/pages/AuthPage';
import ResetPasswordPage from '@features/auth/pages/ResetPasswordPage';
import StaffRegistrationPage from '@features/auth/pages/StaffRegistrationPage';
import VerifyEmailPage from '@features/auth/pages/VerifyEmailPage';
import CartPage from '@features/cart/pages/CartPage';
import HomePage from '@features/home/HomePage';
import AdminOrdersPage from '@features/orders/admin/AdminOrdersPage';
import OrdersPage from '@features/orders/pages/OrdersPage';
import AdminProductsPage from '@features/products/admin/AdminProductsPage';
import ProductCatalogPage from '@features/products/pages/ProductCatalogPage';
import ProductDetailPage from '@features/products/pages/ProductDetailPage';
import AdminUsersPage from '@features/users/admin/AdminUsersPage';
import InviteStaffPage from '@features/users/admin/InviteStaffPage';
import UserDetailPage from '@features/users/pages/UserDetailPage';

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
                path: 'products',
                element: <ProductCatalogPage />,
            },
            {
                path: 'products/:productId',
                element: <ProductDetailPage />,
            },
            {
                path: 'cart',
                element: <CartPage />,
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
                        element: <UserDetailPage me />,
                    },
                    {
                        path: 'account/security',
                        element: <Navigate replace to="/account" />,
                    },
                    {
                        path: 'orders',
                        element: <OrdersPage />,
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
                                path: 'orders',
                                element: <AdminOrdersPage />,
                            },
                            {
                                path: 'products/:productId',
                                element: <ProductDetailPage admin />,
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
                                    {
                                        path: 'users/:userId',
                                        element: <UserDetailPage admin />,
                                    },
                                    {
                                        path: 'access-logs',
                                        element: <AdminAccessLogsPage />,
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
