import { ButtonLink } from '../components/form/Button';
import { PageHeader } from '../components/PageHeader';

export default function NotFoundPage() {
    return (
        <section className="mx-auto grid max-w-3xl gap-4">
            <PageHeader title="Page not found" />

            <p className="text-ui-600 text-base">
                The page you requested does not exist.
            </p>

            <div>
                <ButtonLink to="/" variant="secondary">
                    Return home
                </ButtonLink>
            </div>
        </section>
    );
}
