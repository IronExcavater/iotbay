import {
    type ComponentPropsWithRef,
    type KeyboardEvent,
    type ReactNode,
} from 'react';
import clsx from 'clsx';

export function Table({
    children,
    className,
    ...props
}: ComponentPropsWithRef<'table'>) {
    return (
        <table
            className={clsx('w-full table-fixed text-left text-sm', className)}
            {...props}
        >
            {children}
        </table>
    );
}

export function TableHead({ children }: { children: ReactNode }) {
    return (
        <thead className="border-ui-200 bg-ui-100 text-ui-700 border-b text-xs font-semibold tracking-[0.12em] uppercase">
            {children}
        </thead>
    );
}

// Wraps both the action <td> and its inner alignment div; the two always
// appear together, so combining them removes a layer of boilerplate.
export function TableActionCell({ children }: { children: ReactNode }) {
    return (
        <td className="px-2 py-2 text-right align-middle">
            <div className="flex min-h-8 items-center justify-end">
                {children}
            </div>
        </td>
    );
}

export function TablePrimaryActionRow({
    children,
    className,
    label,
    onAction,
}: {
    children: ReactNode;
    className?: string;
    label: string;
    onAction: () => void;
}) {
    function handleKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
        if (event.key !== 'Enter' && event.key !== ' ') return;

        event.preventDefault();
        onAction();
    }

    return (
        <tr
            aria-label={label}
            className={clsx(
                'border-ui-200 hover:bg-ui-50 focus-visible:bg-ui-50 cursor-pointer border-t align-top transition-[background-color,box-shadow] outline-none focus-visible:[box-shadow:inset_0_0_0_2px_var(--ui-900)]',
                className
            )}
            onClick={onAction}
            onKeyDown={handleKeyDown}
            role="link"
            tabIndex={0}
        >
            {children}
        </tr>
    );
}

// Multi-line (stacked) cell content with consistent minimum height.
export function TableStackCell({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={clsx('grid min-h-8 content-center gap-1', className)}>
            {children}
        </div>
    );
}

// Single-line cell content with consistent minimum height.
export function TableSingleLineCell({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={clsx('flex min-h-8 items-center', className)}>
            {children}
        </div>
    );
}

export function TableMessageRow({
    colSpan,
    message,
    paddingClassName = 'px-5',
    tone,
}: {
    colSpan: number;
    message: string;
    paddingClassName?: string;
    tone: 'error' | 'muted';
}) {
    return (
        <tr className="border-ui-200 border-t">
            <td
                className={clsx(
                    paddingClassName,
                    'py-4',
                    tone === 'error' ? 'text-red-700' : 'text-ui-500'
                )}
                colSpan={colSpan}
            >
                {message}
            </td>
        </tr>
    );
}

export function TableLoadingRow({
    colSpan,
    paddingClassName = 'px-5',
}: {
    colSpan: number;
    paddingClassName?: string;
}) {
    return (
        <tr className="border-ui-200 border-t">
            <td className={clsx(paddingClassName, 'py-4')} colSpan={colSpan}>
                <div className="grid gap-2">
                    <div className="bg-ui-200 h-3 w-32 animate-pulse rounded-full" />
                    <div className="bg-ui-100 h-3 w-56 max-w-full animate-pulse rounded-full" />
                </div>
            </td>
        </tr>
    );
}
