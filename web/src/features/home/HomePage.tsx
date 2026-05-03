import { useAuth } from '@features/auth/AuthProvider';
import { useDocumentTitle } from '@shared/hooks/useDocumentTitle';

export default function HomePage() {
    const { user } = useAuth();
    const heading = user ? `Welcome, ${user.firstName}` : 'Welcome to IoTBay';
    useDocumentTitle('Home');

    return (
        <section className="grid gap-10 py-6 sm:py-10">
            <section className="grid max-w-2xl gap-4">
                <h1 className="text-ui-900 text-4xl font-semibold tracking-tight sm:text-5xl">
                    {heading}
                </h1>
                <p className="text-ui-600 leading-7">
                    Connected home products, account access, and order activity.
                </p>
            </section>
        </section>
    );
}
