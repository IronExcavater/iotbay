import { isRouteErrorResponse, useRouteError } from 'react-router-dom';

import { ButtonLink } from '@shared/ui/form/Button';
import { PageHeader } from '@shared/ui/PageHeader';

export default function ErrorPage() {
    const error = useRouteError();
    const details = getErrorDetails(error);

    return (
        <section className="mx-auto grid max-w-3xl gap-4">
            <PageHeader title={details.title} />

            <p className="text-ui-600 text-base">{details.message}</p>

            <div>
                <ButtonLink to="/" variant="secondary">
                    Return home
                </ButtonLink>
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
