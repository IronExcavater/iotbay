import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';

export default function ErrorPage() {
    const error = useRouteError();
    const details = getErrorDetails(error);

    return (
        <section className="mx-auto grid max-w-3xl gap-4">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {details.title}
            </h1>
            <p className="text-base text-slate-600">{details.message}</p>
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

function getErrorDetails(error: unknown) {
    if (isRouteErrorResponse(error)) {
        if (error.status === 404) {
            return {
                title: 'Page not found',
                message: 'The page you requested does not exist.',
            };
        }

        return {
            title: `Error ${error.status}`,
            message:
                typeof error.statusText === 'string' && error.statusText
                    ? error.statusText
                    : 'Something went wrong.',
        };
    }

    if (error instanceof Error) {
        return {
            title: 'Something went wrong',
            message: error.message || 'Something went wrong.',
        };
    }

    return {
        title: 'Something went wrong',
        message: 'Something went wrong.',
    };
}
