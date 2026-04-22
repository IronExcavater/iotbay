import type { ReactNode } from 'react';

export function PageHeader({
    description,
    title,
}: {
    description?: ReactNode;
    title: ReactNode;
}) {
    return (
        <header className="grid gap-2">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {title}
            </h1>

            {description ? (
                <p className="text-ui-600 text-sm">{description}</p>
            ) : null}
        </header>
    );
}
