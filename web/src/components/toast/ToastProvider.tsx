import {
    createContext,
    useEffect,
    useCallback,
    useContext,
    useMemo,
    useState,
    type PropsWithChildren,
} from 'react';

type ToastTone = 'error' | 'success';

type Toast = {
    id: number;
    message: string;
    tone: ToastTone;
};

type ToastContextValue = {
    showToast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue>({
    showToast: () => {},
});

export function ToastProvider({ children }: PropsWithChildren) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const dismissToast = useCallback((id: number) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);

    const showToast = useCallback(
        (message: string, tone: ToastTone = 'success') => {
            setToasts((current) => [
                {
                    id: Date.now() + Math.random(),
                    message,
                    tone,
                },
                ...current,
            ]);
        },
        []
    );

    const value = useMemo(
        () => ({
            showToast,
        }),
        [showToast]
    );

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="pointer-events-none fixed bottom-4 left-4 z-50 flex max-w-sm flex-col gap-2">
                {toasts.map((toast) => (
                    <ToastItem
                        key={toast.id}
                        onDismiss={() => {
                            dismissToast(toast.id);
                        }}
                    >
                        {toast.message}
                    </ToastItem>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    return useContext(ToastContext);
}

function ToastItem({
    children,
    onDismiss,
}: PropsWithChildren<{
    onDismiss: () => void;
}>) {
    const [isVisible, setIsVisible] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);

    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            setIsVisible(true);
        });
        return () => cancelAnimationFrame(frame);
    }, []);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            setIsLeaving(true);
            window.setTimeout(onDismiss, 200);
        }, 3500);

        return () => window.clearTimeout(timeout);
    }, [onDismiss]);

    function handleDismiss() {
        setIsLeaving(true);
        window.setTimeout(onDismiss, 200);
    }

    return (
        <div
            className={[
                'pointer-events-auto flex items-start gap-3 rounded bg-slate-950 px-4 py-3 text-white shadow-lg transition-all duration-200',
                isVisible && !isLeaving
                    ? 'translate-y-0 opacity-100'
                    : '-translate-y-2 opacity-0',
                'ring-1 ring-white/10',
            ].join(' ')}
        >
            <p className="min-w-0 flex-1 text-sm">{children}</p>
            <button
                aria-label="Dismiss notification"
                className="cursor-pointer text-slate-400 transition-colors hover:text-white"
                onClick={handleDismiss}
                type="button"
            >
                <DismissIcon />
            </button>
        </div>
    );
}

function DismissIcon() {
    return (
        <svg
            aria-hidden="true"
            fill="none"
            height="16"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width="16"
        >
            <path d="M6 6l12 12" />
            <path d="M18 6 6 18" />
        </svg>
    );
}
