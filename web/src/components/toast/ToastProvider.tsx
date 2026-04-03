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

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: PropsWithChildren) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const dismissToast = useCallback((id: number) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);

    const showToast = useCallback(
        (message: string, tone: ToastTone = 'success') => {
            setToasts((current) => [
                ...current,
                {
                    id: Date.now() + Math.random(),
                    message,
                    tone,
                },
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
            <div className="pointer-events-none fixed bottom-4 left-4 z-50 flex max-w-sm flex-col-reverse gap-2">
                {toasts.map((toast) => (
                    <ToastItem
                        key={toast.id}
                        onDismiss={() => {
                            dismissToast(toast.id);
                        }}
                        tone={toast.tone}
                    >
                        {toast.message}
                    </ToastItem>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
}

function ToastItem({
    children,
    onDismiss,
    tone,
}: PropsWithChildren<{
    onDismiss: () => void;
    tone: ToastTone;
}>) {
    const [isVisible, setIsVisible] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);

    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            setIsVisible(true);
        });
        return () => cancelAnimationFrame(frame);
    }, []);

    function handleDismiss() {
        setIsLeaving(true);
        window.setTimeout(onDismiss, 200);
    }

    return (
        <div
            className={[
                'pointer-events-auto flex items-start gap-3 rounded border bg-white px-4 py-3 shadow-lg transition-all duration-200',
                isVisible && !isLeaving
                    ? 'translate-y-0 opacity-100'
                    : '-translate-y-2 opacity-0',
                tone === 'error'
                    ? 'border-red-200 text-red-900'
                    : 'border-emerald-200 text-slate-900',
            ].join(' ')}
        >
            <p className="min-w-0 flex-1 text-sm">{children}</p>
            <button
                className="cursor-pointer text-sm text-slate-500 transition-colors hover:text-slate-900"
                onClick={handleDismiss}
                type="button"
            >
                Dismiss
            </button>
        </div>
    );
}
