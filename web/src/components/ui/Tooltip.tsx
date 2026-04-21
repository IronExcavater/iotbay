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

type TooltipSide = 'bottom' | 'left' | 'right' | 'top';
type TooltipTrigger = ReactElement<{ 'aria-describedby'?: string }>;
type TooltipPosition = Pick<CSSProperties, 'left' | 'top' | 'transform'>;

interface TooltipProps {
    children: TooltipTrigger;
    className?: string;
    label?: ReactNode;
    side?: TooltipSide;
}

const TOOLTIP_GAP = 8;

export function Tooltip({
    children,
    className,
    label,
    side = 'top',
}: TooltipProps) {
    const id = useId();
    const triggerRef = useRef<HTMLSpanElement | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState<TooltipPosition>(() =>
        getHiddenPosition()
    );

    const updatePosition = useCallback(() => {
        if (triggerRef.current === null) return;

        setPosition(getTooltipPosition(triggerRef.current, side));
    }, [side]);

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
                          role="tooltip"
                          style={position}
                      >
                          {label}
                      </span>,
                      document.body
                  )
                : null}
        </span>
    );
}

function getTooltipPosition(
    element: HTMLElement,
    side: TooltipSide
): TooltipPosition {
    const rect = element.getBoundingClientRect();

    if (side === 'bottom') {
        return {
            left: rect.left + rect.width / 2,
            top: rect.bottom + TOOLTIP_GAP,
            transform: 'translateX(-50%)',
        };
    }

    if (side === 'left') {
        return {
            left: rect.left - TOOLTIP_GAP,
            top: rect.top + rect.height / 2,
            transform: 'translate(-100%, -50%)',
        };
    }

    if (side === 'right') {
        return {
            left: rect.right + TOOLTIP_GAP,
            top: rect.top + rect.height / 2,
            transform: 'translateY(-50%)',
        };
    }

    return {
        left: rect.left + rect.width / 2,
        top: rect.top - TOOLTIP_GAP,
        transform: 'translate(-50%, -100%)',
    };
}

function getHiddenPosition(): TooltipPosition {
    return {
        left: -9999,
        top: -9999,
    };
}
