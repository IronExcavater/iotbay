import {
    createContext,
    useEffect,
    useCallback,
    useContext,
    useMemo,
    useState,
    type PropsWithChildren,
} from 'react';
import clsx from 'clsx';
import { FaXmark } from 'react-icons/fa6';

type Toast = {
    id: number;
    message: string;
};

type ToastContextValue = {
    showToast: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue>({
    showToast: () => {},
});

export function ToastProvider({ children }: PropsWithChildren) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const dismissToast = useCallback((id: number) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);

    const showToast = useCallback((message: string) => {
        setToasts((current) => [
            {
                id: Date.now() + Math.random(),
                message,
            },
            ...current,
        ]);
    }, []);

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
        }, 5000);

        return () => window.clearTimeout(timeout);
    }, [onDismiss]);

    function handleDismiss() {
        setIsLeaving(true);
        window.setTimeout(onDismiss, 200);
    }

    return (
        <div
            className={clsx(
                'bg-ui-950 text-ui-0 pointer-events-auto flex items-start gap-3 rounded px-4 py-3 shadow-lg transition-[opacity,transform] duration-200',
                isVisible && !isLeaving
                    ? 'translate-y-0 opacity-100'
                    : '-translate-y-2 opacity-0',
                'ring-ui-700/20 ring-1'
            )}
        >
            <p className="min-w-0 flex-1 text-sm">{children}</p>
            <button
                aria-label="Dismiss notification"
                className="text-ui-300 hover:text-ui-0 focus-visible:ring-ui-700 cursor-pointer transition-colors outline-none focus-visible:ring-2"
                onClick={handleDismiss}
                type="button"
            >
                <FaXmark aria-hidden="true" size={16} />
            </button>
        </div>
    );
}
