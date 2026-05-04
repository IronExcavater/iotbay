import { useEffect, type ReactNode } from 'react';
import clsx from 'clsx';
import { createPortal } from 'react-dom';
import { FaXmark } from 'react-icons/fa6';

import { Button } from '@shared/ui/form/Button';

interface OverlayDialogProps {
    children: ReactNode;
    className?: string;
    onClose: () => void;
    title: ReactNode;
}

export function OverlayDialog({
    children,
    className,
    onClose,
    title,
}: OverlayDialogProps) {
    useEffect(() => {
        const scrollEl =
            document.querySelector<HTMLElement>('[data-scroll-root]') ??
            document.body;
        const scrollY = scrollEl.scrollTop;
        const previousOverflow = scrollEl.style.overflowY;
        scrollEl.style.overflowY = 'hidden';

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                onClose();
            }
        }

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            scrollEl.style.overflowY = previousOverflow;
            scrollEl.scrollTop = scrollY;
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <button
                aria-label="Close dialog"
                className="absolute inset-0 bg-black/45 backdrop-blur-sm"
                onClick={onClose}
                type="button"
            />

            <section
                className={clsx(
                    'bg-ui-0 border-ui-200 relative z-10 flex w-full max-w-xl flex-col overflow-hidden rounded-xl border shadow-2xl',
                    'max-h-[calc(100dvh-3rem)]',
                    className
                )}
            >
                <header className="border-ui-200 flex shrink-0 items-center justify-between gap-4 border-b px-6 py-3">
                    <h2 className="text-ui-900 text-xl font-semibold tracking-tight">
                        {title}
                    </h2>

                    <Button
                        aria-label="Close dialog"
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full p-0"
                        onClick={onClose}
                        type="button"
                        variant="ghost"
                    >
                        <FaXmark aria-hidden="true" className="size-4" />
                    </Button>
                </header>

                <div className="overflow-y-auto px-6 pt-5 pb-6">{children}</div>
            </section>
        </div>,
        document.body
    );
}
