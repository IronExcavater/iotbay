import {
    useEffect,
    useRef,
    type KeyboardEventHandler,
    type RefObject,
} from 'react';

function isModifiedEnter(event: {
    altKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
}) {
    return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
}

function shouldIgnoreTarget(target: HTMLElement) {
    if (
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
    ) {
        return true;
    }

    if (target instanceof HTMLButtonElement) {
        return true;
    }

    if (target instanceof HTMLInputElement) {
        return target.type === 'submit' || target.type === 'button';
    }

    return target.isContentEditable;
}

export function useEnterSubmit({
    canSubmit,
    enabled = true,
    formRef,
}: {
    canSubmit: () => boolean;
    enabled?: boolean;
    formRef: RefObject<HTMLFormElement | null>;
}) {
    const canSubmitRef = useRef(canSubmit);

    useEffect(() => {
        canSubmitRef.current = canSubmit;
    }, [canSubmit]);

    function requestSubmitIfAllowed() {
        window.setTimeout(() => {
            if (canSubmitRef.current()) {
                formRef.current?.requestSubmit();
            }
        }, 0);
    }

    const onKeyDown: KeyboardEventHandler<HTMLFormElement> = (event) => {
        if (
            !enabled ||
            event.key !== 'Enter' ||
            event.defaultPrevented ||
            isModifiedEnter(event)
        ) {
            return;
        }

        const target = event.target;
        if (!(target instanceof HTMLElement) || shouldIgnoreTarget(target)) {
            return;
        }

        event.preventDefault();
        target.blur();
        requestSubmitIfAllowed();
    };

    useEffect(() => {
        if (!enabled) {
            return;
        }

        function handleDocumentKeyDown(event: KeyboardEvent) {
            if (
                event.key !== 'Enter' ||
                event.defaultPrevented ||
                isModifiedEnter(event)
            ) {
                return;
            }

            const activeElement = document.activeElement;
            if (
                activeElement &&
                activeElement !== document.body &&
                activeElement !== document.documentElement
            ) {
                return;
            }

            event.preventDefault();
            requestSubmitIfAllowed();
        }

        document.addEventListener('keydown', handleDocumentKeyDown);
        return () => {
            document.removeEventListener('keydown', handleDocumentKeyDown);
        };
    }, [enabled]);

    return { onKeyDown };
}
