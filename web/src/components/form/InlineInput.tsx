import {
    forwardRef,
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

        useLayoutEffect(() => {
            if (!widthSource) {
                setWidth(minWidth);
                return;
            }

            const measureElement = measureRef.current;
            if (!measureElement) return;

            setWidth(
                Math.max(
                    minWidth,
                    measureElement.getBoundingClientRect().width + widthBuffer
                )
            );
        }, [minWidth, widthBuffer, widthSource]);

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
                    className={className}
                    onAnimationStart={(event) => {
                        onAnimationStart?.(event);

                        if (event.animationName !== 'address-inline-autofill')
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
