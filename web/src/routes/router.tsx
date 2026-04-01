import { createBrowserRouter } from 'react-router-dom';

import AppFrame from '../layouts/AppFrame';
import AccountPage from '../pages/AccountPage';
import AuthPage from '../pages/AuthPage';
import ErrorPage from '../pages/ErrorPage';
import HomePage from '../pages/HomePage';
import NotFoundPage from '../pages/NotFoundPage';

export const router = createBrowserRouter([
    {
        path: '/',
        element: <AppFrame />,
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
                path: 'account',
                element: <AccountPage />,
            },
            {
                path: '*',
                element: <NotFoundPage />,
            },
        ],
    },
]);
