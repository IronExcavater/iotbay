import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from 'react'

export type DemoStage =
    | 'REGISTERING'
    | 'LOADING_PYODIDE'
    | 'INSTALLING_PACKAGES'
    | 'LOADING_SOURCE'
    | 'RESTORING_DB'
    | 'STARTING_FLASK'
    | 'READY'
    | 'RESETTING'
    | 'ERROR'

const STAGE_ORDER: DemoStage[] = [
    'REGISTERING',
    'LOADING_PYODIDE',
    'INSTALLING_PACKAGES',
    'LOADING_SOURCE',
    'RESTORING_DB',
    'STARTING_FLASK',
    'READY',
]

export interface DemoStatus {
    stage: DemoStage
    label: string
    error?: string
    progress: number
}

export interface QueryResult {
    rows: Record<string, unknown>[]
    columns: string[]
    rowcount?: number
    error?: string
}

interface DemoContextValue {
    status: DemoStatus
    reset: () => void
    query: (sql: string) => Promise<QueryResult>
    listTables: () => Promise<QueryResult>
    tableCount: (table: string) => Promise<number>
}

const DemoContext = createContext<DemoContextValue | null>(null)

function progressForStage(stage: DemoStage): number {
    const idx = STAGE_ORDER.indexOf(stage)
    if (idx < 0) return stage === 'ERROR' ? 0 : 100
    return Math.round((idx / (STAGE_ORDER.length - 1)) * 100)
}

async function swMessage<T>(
    type: string,
    data: Record<string, unknown> = {}
): Promise<T> {
    const sw = navigator.serviceWorker.controller
    if (!sw) throw new Error('Service worker not active')
    return new Promise((resolve, reject) => {
        const channel = new MessageChannel()
        channel.port1.onmessage = (e) => {
            if (e.data?.error) reject(new Error(e.data.error))
            else resolve(e.data?.result as T)
        }
        sw.postMessage({ type, ...data }, [channel.port2])
    })
}

export function DemoProvider({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<DemoStatus>({
        stage: 'REGISTERING',
        label: 'Registering service worker',
        progress: 0,
    })
    const channelRef = useRef<BroadcastChannel | null>(null)

    useEffect(() => {
        if (!('serviceWorker' in navigator)) {
            setStatus({
                stage: 'ERROR',
                label: 'Service workers not supported',
                error: 'Your browser does not support service workers.',
                progress: 0,
            })
            return
        }

        const channel = new BroadcastChannel('iotbay-demo')
        channelRef.current = channel

        channel.onmessage = (event) => {
            const { type, stage, label, message } = event.data as {
                type: string
                stage?: DemoStage
                label?: string
                message?: string
            }
            if (type === 'STAGE' && stage) {
                setStatus({
                    stage,
                    label: label ?? stage,
                    progress: progressForStage(stage),
                })
            } else if (type === 'READY') {
                setStatus({ stage: 'READY', label: 'Ready', progress: 100 })
            } else if (type === 'RESETTING') {
                setStatus({
                    stage: 'RESETTING',
                    label: label ?? 'Resetting demo data',
                    progress: 50,
                })
            } else if (type === 'ERROR') {
                setStatus({
                    stage: 'ERROR',
                    label: 'Startup failed',
                    error: message,
                    progress: 0,
                })
            }
        }

        navigator.serviceWorker
            .register(import.meta.env.BASE_URL + 'demo-sw.js')
            .catch((err: unknown) => {
                setStatus({
                    stage: 'ERROR',
                    label: 'Registration failed',
                    error: String(err),
                    progress: 0,
                })
            })

        return () => {
            channel.close()
        }
    }, [])

    const reset = () => {
        navigator.serviceWorker.controller?.postMessage({ type: 'RESET_DEMO' })
        setStatus({
            stage: 'RESETTING',
            label: 'Resetting demo data',
            progress: 50,
        })
    }

    const query = (sql: string) =>
        swMessage<QueryResult>('QUERY', { sql })

    const listTables = () =>
        swMessage<QueryResult>('LIST_TABLES')

    const tableCount = async (table: string) => {
        const result = await swMessage<QueryResult>('TABLE_COUNT', { table })
        const row = result.rows[0]
        return typeof row?.count === 'number' ? row.count : 0
    }

    return (
        <DemoContext.Provider value={{ status, reset, query, listTables, tableCount }}>
            {children}
        </DemoContext.Provider>
    )
}

export function useDemo() {
    const ctx = useContext(DemoContext)
    if (!ctx) throw new Error('useDemo must be inside DemoProvider')
    return ctx
}
