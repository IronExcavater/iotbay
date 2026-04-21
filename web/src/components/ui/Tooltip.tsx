import {
    cloneElement,
    useCallback,
    useId,
    useLayoutEffect,
    useRef,
    useState,
    type CSSProperties,
    type KeyboardEvent,
    type ReactElement,
    type ReactNode,
} from 'react';
import clsx from 'clsx';
import { createPortal } from 'react-dom';

import {
    getHiddenOverlayPosition,
    getOverlayPosition,
    type OverlayAlign,
    type OverlaySide,
} from '../overlay/positioning';

type TooltipTrigger = ReactElement<{ 'aria-describedby'?: string }>;

interface TooltipProps {
    align?: OverlayAlign;
    children: TooltipTrigger;
    className?: string;
    label?: ReactNode;
    side?: OverlaySide;
}

const TOOLTIP_GAP = 8;

export function Tooltip({
    align = 'center',
    children,
    className,
    label,
    side = 'top',
}: TooltipProps) {
    const id = useId();
    const triggerRef = useRef<HTMLSpanElement | null>(null);
    const tooltipRef = useRef<HTMLSpanElement | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState(() => getHiddenOverlayPosition());

    const updatePosition = useCallback(() => {
        if (triggerRef.current === null || tooltipRef.current === null) return;

        setPosition(
            getOverlayPosition(triggerRef.current, tooltipRef.current, {
                align,
                gap: TOOLTIP_GAP,
                padding: 8,
                side,
            })
        );
    }, [align, side]);

    useLayoutEffect(() => {
        if (!isOpen) return;

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isOpen, updatePosition]);

    if (!label) return children;

    const describedBy = [children.props['aria-describedby'], id]
        .filter(Boolean)
        .join(' ');

    return (
        <span
            className={clsx('relative inline-flex min-w-0', className)}
            onBlur={() => {
                setIsOpen(false);
            }}
            onFocus={() => {
                setIsOpen(true);
            }}
            onKeyDown={(event: KeyboardEvent<HTMLSpanElement>) => {
                if (event.key === 'Escape') setIsOpen(false);
            }}
            onPointerEnter={() => {
                setIsOpen(true);
            }}
            onPointerLeave={() => {
                setIsOpen(false);
            }}
            ref={triggerRef}
        >
            {cloneElement(children, { 'aria-describedby': describedBy })}
            {isOpen
                ? createPortal(
                      <span
                          className="pointer-events-none fixed z-80 max-w-64 rounded bg-black px-2 py-1 text-xs font-medium whitespace-nowrap text-white opacity-95 shadow-lg ring-1 ring-white/20"
                          id={id}
                          ref={tooltipRef}
                          role="tooltip"
                          style={position.style as CSSProperties}
                      >
                          {label}
                          <span
                              aria-hidden="true"
                              className="absolute size-2 bg-black"
                              style={position.arrowStyle}
                          />
                      </span>,
                      document.body
                  )
                : null}
        </span>
    );
}
