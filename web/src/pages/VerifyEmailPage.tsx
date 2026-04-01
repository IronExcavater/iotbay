import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { authApi } from '../auth/api';
import { BackendError } from '../services/http';

export default function VerifyEmailPage() {
    const [status, setStatus] = useState<'verifying' | 'error'>('verifying');
    const [message, setMessage] = useState('Verifying your email');

    useEffect(() => {
        const token = new URLSearchParams(window.location.search)
            .get('token')
            ?.trim();
        if (!token) {
            setStatus('error');
            setMessage('Verification link is invalid');
            return;
        }

        let isActive = true;

        void authApi
            .verifyEmail(token)
            .then(() => {
                // The verify endpoint creates the session cookie, so a full reload
                // is the simplest way to let the auth provider bootstrap from /api/me.
                window.location.assign('/');
            })
            .catch((error: unknown) => {
                if (!isActive) {
                    return;
                }

                if (
                    error instanceof BackendError &&
                    error.code === 'INVALID_EMAIL_VERIFICATION_TOKEN'
                ) {
                    setMessage('Verification link is invalid or expired');
                } else {
                    setMessage('Unable to verify your email');
                }
                setStatus('error');
            });

        return () => {
            isActive = false;
        };
    }, []);

    return (
        <section className="mx-auto grid max-w-xl gap-4 rounded border border-slate-200 bg-white p-5">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Verify email
            </h1>
            <p
                className={
                    status === 'error' ? 'text-red-700' : 'text-slate-600'
                }
            >
                {message}
            </p>
            {status === 'error' ? (
                <Link
                    className="text-sm text-slate-600 underline"
                    to="/auth?mode=signup"
                >
                    Back to sign up
                </Link>
            ) : null}
        </section>
    );
}
