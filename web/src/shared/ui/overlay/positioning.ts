import type { CSSProperties } from 'react';

export type OverlayAlign = 'center' | 'end' | 'start';
export type OverlaySide = 'bottom' | 'left' | 'right' | 'top';

export interface OverlayPosition {
    arrowStyle: CSSProperties;
    side: OverlaySide;
    style: CSSProperties;
}

interface OverlayPositionOptions {
    align: OverlayAlign;
    gap: number;
    padding: number;
    side: OverlaySide;
}

const oppositeSide: Record<OverlaySide, OverlaySide> = {
    bottom: 'top',
    left: 'right',
    right: 'left',
    top: 'bottom',
};

const ARROW_INSET = 10;

export function getOverlayPosition(
    anchor: HTMLElement,
    overlay: HTMLElement,
    options: OverlayPositionOptions
): OverlayPosition {
    const anchorRect = anchor.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();
    const side = getResolvedSide(anchorRect, overlayRect, options);
    const left = getOverlayLeft(anchorRect, overlayRect, side, options);
    const top = getOverlayTop(anchorRect, overlayRect, side, options);

    return {
        arrowStyle: getArrowStyle(anchorRect, overlayRect, side, left, top),
        side,
        style: {
            left,
            top,
        },
    };
}

export function getHiddenOverlayPosition(): OverlayPosition {
    return {
        arrowStyle: {
            left: 0,
            top: 0,
        },
        side: 'top',
        style: {
            left: -9999,
            top: -9999,
        },
    };
}

function getResolvedSide(
    anchorRect: DOMRect,
    overlayRect: DOMRect,
    { gap, padding, side }: OverlayPositionOptions
) {
    const preferredSpace = getAvailableSpace(anchorRect, side, padding);
    const opposite = oppositeSide[side];
    const oppositeSpace = getAvailableSpace(anchorRect, opposite, padding);
    const requiredSpace =
        getMainAxisSize(overlayRect, side) + gap + ARROW_INSET;

    if (preferredSpace >= requiredSpace || preferredSpace >= oppositeSpace) {
        return side;
    }

    return opposite;
}

function getAvailableSpace(
    anchorRect: DOMRect,
    side: OverlaySide,
    padding: number
) {
    if (side === 'top') return anchorRect.top - padding;
    if (side === 'bottom')
        return window.innerHeight - anchorRect.bottom - padding;
    if (side === 'left') return anchorRect.left - padding;
    return window.innerWidth - anchorRect.right - padding;
}

function getMainAxisSize(overlayRect: DOMRect, side: OverlaySide) {
    return side === 'top' || side === 'bottom'
        ? overlayRect.height
        : overlayRect.width;
}

function getOverlayLeft(
    anchorRect: DOMRect,
    overlayRect: DOMRect,
    side: OverlaySide,
    { align, gap, padding }: OverlayPositionOptions
) {
    const rawLeft =
        side === 'left'
            ? anchorRect.left - overlayRect.width - gap
            : side === 'right'
              ? anchorRect.right + gap
              : getCrossAxisStart(
                    anchorRect.left,
                    anchorRect.width,
                    overlayRect.width,
                    align
                );

    return clamp(
        rawLeft,
        padding,
        window.innerWidth - overlayRect.width - padding
    );
}

function getOverlayTop(
    anchorRect: DOMRect,
    overlayRect: DOMRect,
    side: OverlaySide,
    { align, gap, padding }: OverlayPositionOptions
) {
    const rawTop =
        side === 'top'
            ? anchorRect.top - overlayRect.height - gap
            : side === 'bottom'
              ? anchorRect.bottom + gap
              : getCrossAxisStart(
                    anchorRect.top,
                    anchorRect.height,
                    overlayRect.height,
                    align
                );

    return clamp(
        rawTop,
        padding,
        window.innerHeight - overlayRect.height - padding
    );
}

function getCrossAxisStart(
    anchorStart: number,
    anchorSize: number,
    overlaySize: number,
    align: OverlayAlign
) {
    if (align === 'start') return anchorStart;
    if (align === 'end') return anchorStart + anchorSize - overlaySize;
    return anchorStart + anchorSize / 2 - overlaySize / 2;
}

function getArrowStyle(
    anchorRect: DOMRect,
    overlayRect: DOMRect,
    side: OverlaySide,
    overlayLeft: number,
    overlayTop: number
): CSSProperties {
    if (side === 'top' || side === 'bottom') {
        const anchorCenter = anchorRect.left + anchorRect.width / 2;
        const arrowLeft = clamp(
            anchorCenter - overlayLeft,
            ARROW_INSET,
            overlayRect.width - ARROW_INSET
        );

        return {
            left: arrowLeft,
            top: side === 'top' ? '100%' : 0,
            transform: 'translate(-50%, -50%) rotate(45deg)',
        };
    }

    const anchorCenter = anchorRect.top + anchorRect.height / 2;
    const arrowTop = clamp(
        anchorCenter - overlayTop,
        ARROW_INSET,
        overlayRect.height - ARROW_INSET
    );

    return {
        left: side === 'left' ? '100%' : 0,
        top: arrowTop,
        transform: 'translate(-50%, -50%) rotate(45deg)',
    };
}

function clamp(value: number, min: number, max: number) {
    if (max < min) return min;
    return Math.min(Math.max(value, min), max);
}
