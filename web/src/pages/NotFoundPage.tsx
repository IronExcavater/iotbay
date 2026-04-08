import { Link } from 'react-router-dom';

import { PageHeader } from '../components/PageHeader';

export default function NotFoundPage() {
    return (
        <section className="mx-auto grid max-w-3xl gap-4">
            <PageHeader title="Page not found" />

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
