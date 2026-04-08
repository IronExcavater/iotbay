import type { ReactNode } from 'react';

export const authPanelClassName =
    'grid gap-4 rounded border border-slate-200 bg-white p-5';

export const authMetaLabelClassName =
    'text-xs font-semibold uppercase tracking-[0.18em] text-slate-500';

export function AuthPageLayout({
    children,
    title,
}: {
    children: ReactNode;
    title: ReactNode;
}) {
    return (
        <section className="mx-auto grid max-w-xl gap-6">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {title}
            </h1>
            {children}
        </section>
    );
}
