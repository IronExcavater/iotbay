import {
    cloneElement,
    useCallback,
    useEffect,
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
    const [isMounted, setIsMounted] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
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

    useEffect(() => {
        if (isOpen) {
            setIsMounted(true);

            const frame = requestAnimationFrame(() => {
                setIsVisible(true);
            });

            return () => {
                cancelAnimationFrame(frame);
            };
        }

        setIsVisible(false);

        const timeout = window.setTimeout(() => {
            setIsMounted(false);
        }, 120);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [isOpen]);

    useLayoutEffect(() => {
        if (!isMounted) return;

        updatePosition();
        if (!isOpen) return;

        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isMounted, isOpen, updatePosition]);

    if (!label) return children;

    const describedBy = [children.props['aria-describedby'], id]
        .filter(Boolean)
        .join(' ');

    return (
        <span
            className={clsx('inline-flex min-w-0', className)}
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
            {isMounted
                ? createPortal(
                      <span
                          className={clsx(
                              'bg-ui-950 text-ui-0 ring-ui-500 pointer-events-none fixed isolate z-80 max-w-64 rounded px-2 py-1 text-xs font-medium whitespace-nowrap opacity-0 shadow-lg ring-1 transition-[opacity,background-color,box-shadow,color] duration-150 ease-out',
                              isVisible && 'opacity-100'
                          )}
                          id={id}
                          ref={tooltipRef}
                          role="tooltip"
                          data-side={position.side}
                          style={position.style as CSSProperties}
                      >
                          {label}
                          <span
                              aria-hidden="true"
                              className="bg-ui-950 absolute size-2"
                              style={position.arrowStyle}
                          />
                      </span>,
                      document.body
                  )
                : null}
        </span>
    );
}
