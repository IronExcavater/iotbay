import { useAuth } from '@features/auth/AuthProvider';
import { ButtonLink } from '@shared/ui/form/Button';

export default function HomePage() {
    const { user } = useAuth();
    const heading = user ? `Welcome, ${user.firstName}` : 'Welcome to IoTBay';

    return (
        <section className="grid gap-10 py-6 sm:py-10">
            <section className="grid max-w-2xl gap-4">
                <h1 className="text-ui-900 text-4xl font-semibold tracking-tight sm:text-5xl">
                    {heading}
                </h1>
                <p className="text-ui-600 leading-7">
                    Browse connected home products and manage your account from
                    one place.
                </p>
                <div className="flex flex-wrap gap-3 pt-1">
                    <ButtonLink to="/products">Catalogue</ButtonLink>
                    {user ? (
                        <ButtonLink to="/orders" variant="secondary">
                            Orders
                        </ButtonLink>
                    ) : (
                        <ButtonLink to="/sign-in" variant="secondary">
                            Sign in
                        </ButtonLink>
                    )}
                </div>
            </section>

            {user && (
                <section className="grid gap-3">
                    <h2 className="text-ui-900 text-lg font-semibold">
                        Account
                    </h2>
                    <p className="text-ui-500 text-sm">{user.email}</p>
                </section>
            )}
        </section>
    );
}
