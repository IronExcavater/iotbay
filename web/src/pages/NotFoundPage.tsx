import { Link } from 'react-router-dom';

export default function NotFoundPage() {
    return (
        <section className="mx-auto grid max-w-3xl gap-4">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Page not found
            </h1>
            <p className="text-base text-slate-600">
                The page you requested does not exist.
            </p>
            <div>
                <Link
                    className="inline-flex rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
                    to="/"
                >
                    Return home
                </Link>
            </div>
        </section>
    );
}
