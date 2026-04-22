import { useEffect, type ReactNode } from 'react';
import clsx from 'clsx';
import { createPortal } from 'react-dom';
import { FaXmark } from 'react-icons/fa6';

import { Button } from '../form/Button';

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
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                onClose();
            }
        }

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
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
                    'bg-ui-0 border-ui-200 relative z-10 grid w-full max-w-xl gap-5 rounded-xl border p-6 shadow-2xl',
                    className
                )}
            >
                <header className="flex items-start justify-between gap-4">
                    <h2 className="text-ui-900 text-xl font-semibold tracking-tight">
                        {title}
                    </h2>

                    <Button
                        aria-label="Close dialog"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full"
                        onClick={onClose}
                        type="button"
                        variant="ghost"
                    >
                        <FaXmark aria-hidden="true" className="size-4" />
                    </Button>
                </header>

                {children}
            </section>
        </div>,
        document.body
    );
}
