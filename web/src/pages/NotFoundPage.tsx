import { Link } from 'react-router-dom';

export default function NotFoundPage() {
    return (
        <section className="space-y-3">
            <h1 className="text-3xl font-semibold text-gray-900">Not found</h1>
            <p className="text-base text-gray-600">
                This route does not exist in the current scaffold.
            </p>
            <Link
                className="text-sm font-medium text-gray-900 underline"
                to="/"
            >
                Go home
            </Link>
        </section>
    );
}
