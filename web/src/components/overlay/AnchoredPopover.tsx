import {
    useEffect,
    useLayoutEffect,
    useRef,
    type ReactNode,
    type RefObject,
} from 'react';
import clsx from 'clsx';
import { createPortal } from 'react-dom';

import {
    getOverlayPosition,
    type OverlayAlign,
    type OverlaySide,
} from './positioning';

interface AnchoredPopoverProps {
    align?: 'center' | 'end' | 'left' | 'right' | 'start';
    anchorRef: RefObject<HTMLElement | null>;
    children: ReactNode;
    className?: string;
    matchAnchorWidth?: boolean;
    onClose: () => void;
    open: boolean;
    side?: OverlaySide;
}

export function AnchoredPopover({
    align = 'left',
    anchorRef,
    children,
    className,
    matchAnchorWidth = false,
    onClose,
    open,
    side = 'bottom',
}: AnchoredPopoverProps) {
    const panelRef = useRef<HTMLDivElement | null>(null);
    const frameRef = useRef<number | null>(null);

    useLayoutEffect(() => {
        if (!open || !anchorRef.current || !panelRef.current) {
            return;
        }

        function updatePosition() {
            const anchor = anchorRef.current;
            const panel = panelRef.current;
            if (!anchor || !panel) {
                return;
            }

            const rect = anchor.getBoundingClientRect();
            if (matchAnchorWidth) {
                panel.style.minWidth = `${rect.width}px`;
            } else {
                panel.style.minWidth = '';
            }

            const position = getOverlayPosition(anchor, panel, {
                align: normalizePopoverAlign(align),
                gap: 4,
                padding: 12,
                side,
            });

            panel.style.left = `${position.style.left}px`;
            panel.style.top = `${position.style.top}px`;
            panel.style.opacity = '1';
        }

        function queueUpdatePosition() {
            if (frameRef.current !== null) {
                cancelAnimationFrame(frameRef.current);
            }

            frameRef.current = requestAnimationFrame(() => {
                frameRef.current = null;
                updatePosition();
            });
        }

        updatePosition();
        window.addEventListener('resize', queueUpdatePosition);
        window.addEventListener('scroll', queueUpdatePosition, true);

        return () => {
            if (frameRef.current !== null) {
                cancelAnimationFrame(frameRef.current);
                frameRef.current = null;
            }
            window.removeEventListener('resize', queueUpdatePosition);
            window.removeEventListener('scroll', queueUpdatePosition, true);
        };
    }, [align, anchorRef, matchAnchorWidth, open, side]);

    useEffect(() => {
        if (!open) {
            return;
        }

        function handlePointerDown(event: MouseEvent) {
            const target = event.target as Node;
            if (
                anchorRef.current?.contains(target) ||
                panelRef.current?.contains(target)
            ) {
                return;
            }

            onClose();
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                onClose();
            }
        }

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [anchorRef, onClose, open]);

    if (!open) {
        return null;
    }

    return createPortal(
        <div
            className={clsx(
                'bg-ui-0 border-ui-200 z-70 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded border shadow-lg',
                className
            )}
            ref={panelRef}
            style={{
                left: 0,
                opacity: 0,
                position: 'fixed',
                top: 0,
            }}
        >
            {children}
        </div>,
        document.body
    );
}

function normalizePopoverAlign(
    align: AnchoredPopoverProps['align']
): OverlayAlign {
    if (align === 'right') return 'end';
    if (align === 'left') return 'start';
    return align ?? 'start';
}
