import {
    forwardRef,
    useEffect,
    useCallback,
    useLayoutEffect,
    useRef,
    useState,
    type ForwardedRef,
    type InputHTMLAttributes,
} from 'react';
import clsx from 'clsx';

const DEFAULT_MIN_WIDTH = 8;
const DEFAULT_WIDTH_BUFFER = 0;
const AUTOFILL_DETECT_ANIMATION_NAME = 'autofill-detect';

interface InlineInputProps extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'onChange' | 'value'
> {
    minWidth?: number;
    onAutoFill?: () => void;
    onValueChange?: (value: string) => void;
    usePlaceholderWidth?: boolean;
    value: number | string;
    widthBuffer?: number;
}

export const InlineInput = forwardRef<HTMLInputElement, InlineInputProps>(
    function InlineInput(
        {
            className,
            minWidth = DEFAULT_MIN_WIDTH,
            onAnimationStart,
            onAutoFill,
            onValueChange,
            placeholder,
            style,
            usePlaceholderWidth = true,
            value,
            widthBuffer = DEFAULT_WIDTH_BUFFER,
            ...props
        },
        forwardedRef
    ) {
        const measureRef = useRef<HTMLSpanElement | null>(null);
        const [width, setWidth] = useState(minWidth);
        const inputValue = value === null || value === undefined ? '' : value;
        const textValue = String(inputValue);
        const placeholderValue = placeholder ? String(placeholder) : '';
        const widthSource =
            textValue || (usePlaceholderWidth ? placeholderValue : '');
        const inputClassName = clsx(
            className,
            onAutoFill && 'browser-autofill:animate-autofill-detect'
        );

        const setInputRef = useCallback(
            (element: HTMLInputElement | null) => {
                assignRef(forwardedRef, element);
            },
            [forwardedRef]
        );
        const syncInputValue = useCallback(
            (element: HTMLInputElement) => {
                onValueChange?.(element.value);
            },
            [onValueChange]
        );
        const updateWidth = useCallback(() => {
            if (!widthSource) {
                setWidth(minWidth);
                return;
            }

            const measureElement = measureRef.current;
            if (!measureElement) return;

            const nextWidth = Math.max(
                minWidth,
                measureElement.getBoundingClientRect().width + widthBuffer
            );

            setWidth((current) =>
                current === nextWidth ? current : nextWidth
            );
        }, [minWidth, widthBuffer, widthSource]);

        const updateWidthRef = useRef(updateWidth);
        useLayoutEffect(() => {
            updateWidthRef.current = updateWidth;
            updateWidth();
        }, [updateWidth]);

        useEffect(() => {
            const measureElement = measureRef.current;
            if (!measureElement || typeof ResizeObserver === 'undefined')
                return;

            const resizeObserver = new ResizeObserver(() =>
                updateWidthRef.current()
            );
            resizeObserver.observe(measureElement);
            return () => resizeObserver.disconnect();
        }, []);

        useEffect(() => {
            const fontSet = document.fonts;
            let isCancelled = false;

            void fontSet.ready.then(() => {
                if (!isCancelled) updateWidthRef.current();
            });

            const handleFontEvent = () => updateWidthRef.current();
            fontSet.addEventListener('loadingdone', handleFontEvent);
            fontSet.addEventListener('loadingerror', handleFontEvent);

            return () => {
                isCancelled = true;
                fontSet.removeEventListener('loadingdone', handleFontEvent);
                fontSet.removeEventListener('loadingerror', handleFontEvent);
            };
        }, []);

        return (
            <>
                <span
                    aria-hidden="true"
                    className={clsx(
                        'pointer-events-none invisible absolute top-0 left-0 max-w-none whitespace-pre',
                        className
                    )}
                    ref={measureRef}
                    style={{
                        maxWidth: 'none',
                        minWidth: 0,
                        width: 'auto',
                    }}
                >
                    {widthSource}
                </span>

                <input
                    {...props}
                    className={inputClassName}
                    onAnimationStart={(event) => {
                        onAnimationStart?.(event);

                        if (
                            event.animationName !==
                            AUTOFILL_DETECT_ANIMATION_NAME
                        )
                            return;

                        const element = event.currentTarget;

                        window.requestAnimationFrame(() => {
                            onAutoFill?.();
                            syncInputValue(element);
                        });
                    }}
                    onChange={(event) => {
                        syncInputValue(event.currentTarget);
                    }}
                    placeholder={placeholder}
                    ref={setInputRef}
                    style={{ ...style, minWidth, width }}
                    value={inputValue}
                />
            </>
        );
    }
);

function assignRef<T>(ref: ForwardedRef<T>, value: T | null) {
    if (typeof ref === 'function') {
        ref(value);
        return;
    }

    if (ref) {
        ref.current = value;
    }
}
