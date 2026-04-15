import { type ComponentProps } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';

// Shared text-link visual style for both internal and external links.
const textLinkClass =
    'inline-flex w-fit items-center gap-1.5 text-sm text-slate-600 underline-offset-4 outline-none transition-colors hover:text-slate-900 hover:underline focus-visible:text-slate-900 focus-visible:underline focus-visible:outline-none';

// Internal navigation link styled as a text link.
export function TextLink({ className, ...props }: ComponentProps<typeof Link>) {
    return <Link className={clsx(textLinkClass, className)} {...props} />;
}

// External anchor styled as a text link.
export function TextAnchor({ className, ...props }: ComponentProps<'a'>) {
    return <a className={clsx(textLinkClass, className)} {...props} />;
}
