import { useCallback, useLayoutEffect, useRef, type ChangeEvent } from 'react';
import type { InputValueType } from '@shared/value-objects/base';

export function useFormattedInput<TContext = void>({
    context,
    onChange,
    value,
    valueType,
}: {
    context?: TContext;
    onChange: (value: string) => void;
    value: string;
    valueType: InputValueType<TContext>;
}) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const nextCaretRef = useRef<number | null>(null);

    const handleChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const rawValue = event.target.value;
            const selectionStart =
                event.target.selectionStart ?? rawValue.length;
            const nextValue = valueType.formatInput(rawValue, context);
            const formattedPrefix = valueType.formatInput(
                rawValue.slice(0, selectionStart),
                context
            );
            const nextCaret = valueType.caretPosition
                ? valueType.caretPosition(rawValue, selectionStart, context)
                : formattedPrefix.length;

            nextCaretRef.current = Math.min(nextCaret, nextValue.length);

            onChange(nextValue);
        },
        [context, onChange, valueType]
    );

    useLayoutEffect(() => {
        if (nextCaretRef.current === null || !inputRef.current) {
            return;
        }

        inputRef.current.setSelectionRange(
            nextCaretRef.current,
            nextCaretRef.current
        );
        nextCaretRef.current = null;
    }, [value]);

    return {
        handleChange,
        inputRef,
    };
}
