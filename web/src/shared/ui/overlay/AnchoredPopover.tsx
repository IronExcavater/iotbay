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
} from '@shared/ui/overlay/positioning';

interface AnchoredPopoverProps {
    align?: 'center' | 'end' | 'left' | 'right' | 'start';
    anchorRef: RefObject<HTMLElement | null>;
    children: ReactNode;
    className?: string;
    matchAnchorWidth?: boolean;
    onClose: () => void;
    open: boolean;
    side?: OverlaySide;
    zIndex?: number;
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
    zIndex = 20,
}: AnchoredPopoverProps) {
    const panelRef = useRef<HTMLDivElement | null>(null);

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

        const anchor = anchorRef.current;
        const panel = panelRef.current;
        const resizeObserver = new ResizeObserver(() => updatePosition());
        const visualViewport = window.visualViewport;

        let scrollFrameId: number | null = null;
        function queueUpdatePosition() {
            if (scrollFrameId !== null) return;
            scrollFrameId = requestAnimationFrame(() => {
                scrollFrameId = null;
                updatePosition();
            });
        }

        updatePosition();
        resizeObserver.observe(anchor);
        resizeObserver.observe(panel);

        const initFrameId = requestAnimationFrame(() => updatePosition());

        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', queueUpdatePosition, true);
        visualViewport?.addEventListener('resize', updatePosition);
        visualViewport?.addEventListener('scroll', queueUpdatePosition);

        return () => {
            cancelAnimationFrame(initFrameId);
            if (scrollFrameId !== null) cancelAnimationFrame(scrollFrameId);
            resizeObserver.disconnect();
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', queueUpdatePosition, true);
            visualViewport?.removeEventListener('resize', updatePosition);
            visualViewport?.removeEventListener('scroll', queueUpdatePosition);
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
                'bg-ui-0 border-ui-200 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded border shadow-lg',
                className
            )}
            ref={panelRef}
            style={{
                left: 0,
                opacity: 0,
                position: 'fixed',
                top: 0,
                zIndex,
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
