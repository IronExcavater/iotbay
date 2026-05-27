import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type KeyboardEvent,
} from 'react'
import { useDemo, type QueryResult } from './DemoContext'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'database' | 'query' | 'api' | 'network' | 'python' | 'routes'

interface NetworkEntry {
    id: number
    method: string
    path: string
    status: number
    ms: number
    requestBody?: string
    responseBody?: string
}

interface ApiResponse {
    status: number
    body: string
    ms: number
}

// ─── Shared request helper ────────────────────────────────────────────────────

async function swQuery(sql: string): Promise<QueryResult> {
    const sw = navigator.serviceWorker.controller
    if (!sw) throw new Error('Service worker not active')
    return new Promise((resolve, reject) => {
        const ch = new MessageChannel()
        ch.port1.onmessage = (e) => {
            if (e.data?.error) reject(new Error(e.data.error))
            else resolve(e.data?.result as QueryResult)
        }
        sw.postMessage({ type: 'QUERY', sql }, [ch.port2])
    })
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'database', label: 'Database' },
    { id: 'query', label: 'Query' },
    { id: 'api', label: 'API' },
    { id: 'network', label: 'Network' },
    { id: 'python', label: 'Python' },
    { id: 'routes', label: 'Routes' },
]

// ─── Result table ─────────────────────────────────────────────────────────────

function ResultTable({ result }: { result: QueryResult | null }) {
    if (!result) return null
    if (result.error) {
        return (
            <div className="rounded border border-red-200 bg-red-50 p-3 font-mono text-xs text-red-700">
                {result.error}
            </div>
        )
    }
    if (!result.rows.length) {
        return <p className="text-xs text-ui-400">No rows returned.</p>
    }
    return (
        <div className="overflow-auto rounded border border-ui-200">
            <table className="w-full text-xs">
                <thead>
                    <tr className="border-b border-ui-200 bg-ui-100">
                        {result.columns.map((col) => (
                            <th
                                key={col}
                                className="px-3 py-2 text-left font-medium text-ui-600"
                            >
                                {col}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {result.rows.map((row, i) => (
                        <tr
                            key={i}
                            className="border-b border-ui-100 last:border-0 hover:bg-ui-50"
                        >
                            {result.columns.map((col) => (
                                <td
                                    key={col}
                                    className="max-w-[200px] truncate px-3 py-2 font-mono text-ui-700"
                                    title={String(row[col] ?? '')}
                                >
                                    {row[col] === null ? (
                                        <span className="text-ui-400">null</span>
                                    ) : (
                                        String(row[col])
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            <p className="border-t border-ui-100 px-3 py-1.5 text-xs text-ui-400">
                {result.rows.length} row{result.rows.length !== 1 ? 's' : ''}
            </p>
        </div>
    )
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab() {
    const { status, reset } = useDemo()
    const [tables, setTables] = useState<{ name: string; count: number }[]>([])

    useEffect(() => {
        swQuery(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        )
            .then(async (result) => {
                const names = result.rows.map((r) => String(r.name))
                const counts = await Promise.all(
                    names.map((name) =>
                        swQuery(`SELECT COUNT(*) as c FROM "${name}"`).then(
                            (r) => Number(r.rows[0]?.c ?? 0)
                        )
                    )
                )
                setTables(names.map((name, i) => ({ name, count: counts[i] })))
            })
            .catch(() => {})
    }, [])

    return (
        <div className="flex flex-col gap-5 p-4">
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'Runtime', value: 'Pyodide (Python WASM)' },
                    { label: 'Backend', value: 'Flask 3.1' },
                    { label: 'Database', value: 'SQLite (IndexedDB)' },
                ].map(({ label, value }) => (
                    <div
                        key={label}
                        className="rounded border border-ui-200 bg-ui-50 p-3"
                    >
                        <p className="text-xs text-ui-500">{label}</p>
                        <p className="mt-0.5 text-sm font-medium text-ui-900">{value}</p>
                    </div>
                ))}
            </div>

            <div>
                <p className="mb-2 text-xs font-medium text-ui-600 uppercase tracking-wider">
                    Demo credentials
                </p>
                <div className="flex flex-col gap-1 font-mono text-xs text-ui-700">
                    <span>ops.admin@iotbay.local / password (staff)</span>
                    <span>superadmin@iotbay.local / password (super admin)</span>
                    <span>casey.customer@example.com / password (customer)</span>
                </div>
            </div>

            {tables.length > 0 && (
                <div>
                    <p className="mb-2 text-xs font-medium text-ui-600 uppercase tracking-wider">
                        Database tables
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                        {tables.map(({ name, count }) => (
                            <div
                                key={name}
                                className="flex items-center justify-between rounded border border-ui-200 px-2.5 py-1.5"
                            >
                                <span className="font-mono text-xs text-ui-700">{name}</span>
                                <span className="text-xs text-ui-400">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex gap-2">
                <button
                    className="rounded-md border border-ui-200 bg-ui-100 px-3 py-1.5 text-xs font-medium text-ui-700 hover:bg-ui-200"
                    onClick={reset}
                >
                    Reset demo data
                </button>
            </div>
        </div>
    )
}

// ─── Tab: Database ────────────────────────────────────────────────────────────

function DatabaseTab() {
    const [tables, setTables] = useState<string[]>([])
    const [selected, setSelected] = useState<string | null>(null)
    const [result, setResult] = useState<QueryResult | null>(null)
    const [loading, setLoading] = useState(false)
    const [filter, setFilter] = useState('')

    useEffect(() => {
        swQuery(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        )
            .then((r) => setTables(r.rows.map((row) => String(row.name))))
            .catch(() => {})
    }, [])

    const loadTable = async (name: string) => {
        setSelected(name)
        setLoading(true)
        try {
            const res = await swQuery(`SELECT * FROM "${name}" LIMIT 100`)
            setResult(res)
        } catch (e) {
            setResult({ rows: [], columns: [], error: String(e) })
        } finally {
            setLoading(false)
        }
    }

    const filtered = filter
        ? result
            ? {
                  ...result,
                  rows: result.rows.filter((row) =>
                      Object.values(row).some((v) =>
                          String(v ?? '').toLowerCase().includes(filter.toLowerCase())
                      )
                  ),
              }
            : null
        : result

    return (
        <div className="flex h-full">
            {/* Sidebar */}
            <div className="w-40 shrink-0 overflow-y-auto border-r border-ui-200 py-2">
                {tables.map((name) => (
                    <button
                        key={name}
                        onClick={() => loadTable(name)}
                        className={`w-full px-3 py-1.5 text-left font-mono text-xs transition-colors ${
                            selected === name
                                ? 'bg-ui-200 text-ui-900'
                                : 'text-ui-600 hover:bg-ui-100'
                        }`}
                    >
                        {name}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col gap-3 overflow-hidden p-3">
                {selected && (
                    <input
                        className="w-full rounded border border-ui-200 bg-ui-50 px-2.5 py-1.5 text-xs text-ui-900 placeholder:text-ui-400 focus:ring-1 focus:ring-ui-500 focus:outline-none"
                        placeholder="Filter rows…"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                )}
                {loading ? (
                    <p className="text-xs text-ui-400">Loading…</p>
                ) : (
                    <div className="overflow-auto">
                        <ResultTable result={filtered} />
                    </div>
                )}
                {!selected && (
                    <p className="text-xs text-ui-400">Select a table to browse.</p>
                )}
            </div>
        </div>
    )
}

// ─── Tab: Query ───────────────────────────────────────────────────────────────

function QueryTab() {
    const [sql, setSql] = useState('SELECT * FROM products LIMIT 10;')
    const [result, setResult] = useState<QueryResult | null>(null)
    const [loading, setLoading] = useState(false)
    const [history, setHistory] = useState<string[]>([])

    const run = async () => {
        if (!sql.trim()) return
        setLoading(true)
        try {
            const res = await swQuery(sql)
            setResult(res)
            setHistory((h) => [sql, ...h.filter((s) => s !== sql)].slice(0, 20))
        } catch (e) {
            setResult({ rows: [], columns: [], error: String(e) })
        } finally {
            setLoading(false)
        }
    }

    const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault()
            run()
        }
    }

    return (
        <div className="flex h-full flex-col gap-3 p-3">
            <div className="flex gap-2">
                <textarea
                    className="flex-1 resize-none rounded border border-ui-200 bg-ui-50 p-2.5 font-mono text-xs text-ui-900 placeholder:text-ui-400 focus:ring-1 focus:ring-ui-500 focus:outline-none"
                    rows={4}
                    value={sql}
                    onChange={(e) => setSql(e.target.value)}
                    onKeyDown={onKeyDown}
                    spellCheck={false}
                    placeholder="SELECT * FROM products;"
                />
                {history.length > 0 && (
                    <div className="flex w-40 flex-col overflow-y-auto rounded border border-ui-200 bg-ui-50">
                        <p className="border-b border-ui-200 px-2 py-1 text-xs font-medium text-ui-500">
                            History
                        </p>
                        {history.map((h, i) => (
                            <button
                                key={i}
                                className="truncate px-2 py-1 text-left text-xs text-ui-600 hover:bg-ui-100"
                                onClick={() => setSql(h)}
                                title={h}
                            >
                                {h}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <div className="flex items-center gap-2">
                <button
                    className="rounded-md bg-ui-900 px-3 py-1.5 text-xs font-medium text-ui-0 hover:bg-ui-700 disabled:opacity-50"
                    onClick={run}
                    disabled={loading}
                >
                    {loading ? 'Running…' : 'Run (Ctrl+Enter)'}
                </button>
                {result && (
                    <span className="text-xs text-ui-400">
                        {result.error ? 'Error' : `${result.rows.length} row${result.rows.length !== 1 ? 's' : ''}`}
                    </span>
                )}
            </div>
            <div className="flex-1 overflow-auto">
                <ResultTable result={result} />
            </div>
        </div>
    )
}

// ─── Tab: API ─────────────────────────────────────────────────────────────────

function ApiTab() {
    const [method, setMethod] = useState<'GET' | 'POST' | 'PATCH' | 'DELETE'>('GET')
    const [path, setPath] = useState('/api/products')
    const [body, setBody] = useState('')
    const [response, setResponse] = useState<ApiResponse | null>(null)
    const [loading, setLoading] = useState(false)

    const send = async () => {
        setLoading(true)
        const start = Date.now()
        try {
            const opts: RequestInit = {
                method,
                credentials: 'include',
                headers: body ? { 'Content-Type': 'application/json' } : {},
            }
            if (body && method !== 'GET') opts.body = body
            const res = await fetch(path, opts)
            const text = await res.text()
            setResponse({ status: res.status, body: text, ms: Date.now() - start })
        } catch (e) {
            setResponse({ status: 0, body: String(e), ms: Date.now() - start })
        } finally {
            setLoading(false)
        }
    }

    const formattedBody = (() => {
        if (!response) return ''
        try {
            return JSON.stringify(JSON.parse(response.body), null, 2)
        } catch {
            return response.body
        }
    })()

    return (
        <div className="flex h-full flex-col gap-3 p-3">
            <div className="flex gap-2">
                <select
                    className="rounded border border-ui-200 bg-ui-50 px-2 py-1.5 text-xs text-ui-900 focus:ring-1 focus:ring-ui-500 focus:outline-none"
                    value={method}
                    onChange={(e) => setMethod(e.target.value as typeof method)}
                >
                    {['GET', 'POST', 'PATCH', 'DELETE'].map((m) => (
                        <option key={m}>{m}</option>
                    ))}
                </select>
                <input
                    className="flex-1 rounded border border-ui-200 bg-ui-50 px-2.5 py-1.5 font-mono text-xs text-ui-900 focus:ring-1 focus:ring-ui-500 focus:outline-none"
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    placeholder="/api/products"
                />
                <button
                    className="rounded-md bg-ui-900 px-3 py-1.5 text-xs font-medium text-ui-0 hover:bg-ui-700 disabled:opacity-50"
                    onClick={send}
                    disabled={loading}
                >
                    {loading ? 'Sending…' : 'Send'}
                </button>
            </div>

            {method !== 'GET' && (
                <textarea
                    className="resize-none rounded border border-ui-200 bg-ui-50 p-2.5 font-mono text-xs text-ui-900 placeholder:text-ui-400 focus:ring-1 focus:ring-ui-500 focus:outline-none"
                    rows={3}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder='{"key": "value"}'
                    spellCheck={false}
                />
            )}

            {response && (
                <div className="flex flex-1 flex-col gap-1.5 overflow-hidden">
                    <div className="flex items-center gap-2">
                        <span
                            className={`text-xs font-medium ${response.status >= 400 ? 'text-red-600' : response.status >= 200 ? 'text-green-600' : 'text-ui-500'}`}
                        >
                            {response.status}
                        </span>
                        <span className="text-xs text-ui-400">{response.ms}ms</span>
                    </div>
                    <pre className="flex-1 overflow-auto rounded border border-ui-200 bg-ui-50 p-2.5 font-mono text-xs text-ui-800 whitespace-pre-wrap">
                        {formattedBody}
                    </pre>
                </div>
            )}
        </div>
    )
}

// ─── Tab: Network ─────────────────────────────────────────────────────────────

function NetworkTab({ entries }: { entries: NetworkEntry[] }) {
    const [expanded, setExpanded] = useState<number | null>(null)

    if (!entries.length) {
        return (
            <div className="flex flex-1 items-center justify-center p-4">
                <p className="text-xs text-ui-400">
                    No requests yet. Use the app to see intercepted API calls.
                </p>
            </div>
        )
    }

    return (
        <div className="flex flex-col overflow-auto">
            <div className="grid grid-cols-[60px_1fr_60px_60px] border-b border-ui-200 bg-ui-100 px-3 py-1.5 text-xs font-medium text-ui-500">
                <span>Method</span>
                <span>Path</span>
                <span>Status</span>
                <span>ms</span>
            </div>
            {entries.map((entry) => (
                <div key={entry.id}>
                    <button
                        className="grid w-full grid-cols-[60px_1fr_60px_60px] border-b border-ui-100 px-3 py-1.5 text-left text-xs hover:bg-ui-50"
                        onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                    >
                        <span
                            className={`font-medium ${entry.method === 'GET' ? 'text-blue-600' : entry.method === 'DELETE' ? 'text-red-600' : 'text-orange-600'}`}
                        >
                            {entry.method}
                        </span>
                        <span className="truncate font-mono text-ui-700">{entry.path}</span>
                        <span
                            className={`${entry.status >= 400 ? 'text-red-600' : 'text-green-600'}`}
                        >
                            {entry.status}
                        </span>
                        <span className="text-ui-400">{entry.ms}</span>
                    </button>
                    {expanded === entry.id && (
                        <div className="border-b border-ui-100 bg-ui-50 p-3">
                            {entry.requestBody && (
                                <div className="mb-2">
                                    <p className="mb-1 text-xs font-medium text-ui-500">
                                        Request body
                                    </p>
                                    <pre className="overflow-auto rounded border border-ui-200 bg-white p-2 font-mono text-xs text-ui-800">
                                        {entry.requestBody}
                                    </pre>
                                </div>
                            )}
                            {entry.responseBody && (
                                <div>
                                    <p className="mb-1 text-xs font-medium text-ui-500">
                                        Response
                                    </p>
                                    <pre className="overflow-auto rounded border border-ui-200 bg-white p-2 font-mono text-xs text-ui-800 whitespace-pre-wrap">
                                        {(() => {
                                            try {
                                                return JSON.stringify(
                                                    JSON.parse(entry.responseBody!),
                                                    null,
                                                    2
                                                )
                                            } catch {
                                                return entry.responseBody
                                            }
                                        })()}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}

// ─── Tab: Python REPL ─────────────────────────────────────────────────────────

function PythonTab() {
    const [code, setCode] = useState('print("Hello from Python!")\nlen(list(_app.url_map.iter_rules()))')
    const [output, setOutput] = useState<{ text: string; error: boolean }[]>([])
    const [loading, setLoading] = useState(false)

    const run = async () => {
        if (!code.trim()) return
        setLoading(true)
        try {
            const result = await swQuery(`SELECT 'python_repl' as type`)
            // Actually run via a special SW message
            const sw = navigator.serviceWorker.controller
            if (!sw) throw new Error('Service worker not active')
            const pyResult = await new Promise<{ out: string; error: boolean }>(
                (resolve, reject) => {
                    const ch = new MessageChannel()
                    ch.port1.onmessage = (e) => resolve(e.data)
                    sw.postMessage({ type: 'PYTHON_EVAL', code }, [ch.port2])
                }
            )
            setOutput((o) => [...o, { text: pyResult.out, error: pyResult.error }])
        } catch (e) {
            setOutput((o) => [...o, { text: String(e), error: true }])
        } finally {
            setLoading(false)
        }
    }

    const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault()
            run()
        }
    }

    return (
        <div className="flex h-full flex-col gap-3 p-3">
            <textarea
                className="resize-none rounded border border-ui-200 bg-ui-50 p-2.5 font-mono text-xs text-ui-900 placeholder:text-ui-400 focus:ring-1 focus:ring-ui-500 focus:outline-none"
                rows={5}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={onKeyDown}
                spellCheck={false}
                placeholder="Python code… (Ctrl+Enter to run)"
            />
            <div className="flex items-center gap-2">
                <button
                    className="rounded-md bg-ui-900 px-3 py-1.5 text-xs font-medium text-ui-0 hover:bg-ui-700 disabled:opacity-50"
                    onClick={run}
                    disabled={loading}
                >
                    {loading ? 'Running…' : 'Run (Ctrl+Enter)'}
                </button>
                <button
                    className="text-xs text-ui-400 hover:text-ui-700"
                    onClick={() => setOutput([])}
                >
                    Clear
                </button>
            </div>
            <div className="flex-1 overflow-auto rounded border border-ui-200 bg-ui-950 p-3 font-mono text-xs text-ui-200">
                {output.length === 0 && (
                    <p className="text-ui-600">
                        Output will appear here. Variables like _app, _client, _ctx are available.
                    </p>
                )}
                {output.map((o, i) => (
                    <div key={i} className={`mb-2 ${o.error ? 'text-red-400' : 'text-green-300'}`}>
                        <span className="text-ui-500">{'>>> '}</span>
                        <pre className="inline whitespace-pre-wrap">{o.text}</pre>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─── Tab: Routes ─────────────────────────────────────────────────────────────

function RoutesTab() {
    const [routes, setRoutes] = useState<QueryResult | null>(null)
    const [filter, setFilter] = useState('')

    useEffect(() => {
        const sw = navigator.serviceWorker.controller
        if (!sw) return
        const ch = new MessageChannel()
        ch.port1.onmessage = (e) => setRoutes(e.data?.result ?? null)
        sw.postMessage({ type: 'LIST_ROUTES' }, [ch.port2])
    }, [])

    const filtered = filter && routes
        ? {
              ...routes,
              rows: routes.rows.filter((r) =>
                  Object.values(r).some((v) =>
                      String(v ?? '').toLowerCase().includes(filter.toLowerCase())
                  )
              ),
          }
        : routes

    return (
        <div className="flex h-full flex-col gap-3 p-3">
            <input
                className="rounded border border-ui-200 bg-ui-50 px-2.5 py-1.5 text-xs text-ui-900 placeholder:text-ui-400 focus:ring-1 focus:ring-ui-500 focus:outline-none"
                placeholder="Filter routes…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
            />
            <div className="flex-1 overflow-auto">
                {routes === null ? (
                    <p className="text-xs text-ui-400">Loading routes…</p>
                ) : (
                    <ResultTable result={filtered} />
                )}
            </div>
        </div>
    )
}

// ─── Main DevTools panel ──────────────────────────────────────────────────────

export function DemoDevTools({ onClose }: { onClose: () => void }) {
    const [activeTab, setActiveTab] = useState<Tab>('overview')
    const [height, setHeight] = useState(400)
    const [networkEntries, setNetworkEntries] = useState<NetworkEntry[]>([])
    const entryIdRef = useRef(0)
    const dragRef = useRef<{ startY: number; startH: number } | null>(null)

    // Intercept fetch for network log
    useEffect(() => {
        const orig = window.fetch
        window.fetch = async (...args) => {
            const req = new Request(...args)
            const url = new URL(req.url, location.href)
            if (!url.pathname.startsWith('/api/')) return orig(...args)

            const id = ++entryIdRef.current
            const start = Date.now()
            let requestBody = ''
            try { requestBody = await req.clone().text() } catch { }

            const res = await orig(...args)
            const ms = Date.now() - start
            let responseBody = ''
            try { responseBody = await res.clone().text() } catch { }

            setNetworkEntries((prev) => [
                {
                    id,
                    method: req.method,
                    path: url.pathname + url.search,
                    status: res.status,
                    ms,
                    requestBody: requestBody || undefined,
                    responseBody: responseBody || undefined,
                },
                ...prev.slice(0, 99),
            ])
            return res
        }
        return () => { window.fetch = orig }
    }, [])

    // Drag-to-resize
    const onDragStart = (e: React.MouseEvent) => {
        dragRef.current = { startY: e.clientY, startH: height }
        const onMove = (ev: MouseEvent) => {
            if (!dragRef.current) return
            const delta = dragRef.current.startY - ev.clientY
            setHeight(Math.max(200, Math.min(window.innerHeight * 0.85, dragRef.current.startH + delta)))
        }
        const onUp = () => {
            dragRef.current = null
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
    }

    return (
        <div
            className="fixed right-0 bottom-8 left-0 z-[9997] flex flex-col border-t border-ui-200 bg-ui-0 shadow-xl"
            style={{ height }}
        >
            {/* Resize handle */}
            <div
                className="h-1 w-full cursor-ns-resize bg-ui-100 hover:bg-ui-300"
                onMouseDown={onDragStart}
            />

            {/* Tab bar */}
            <div className="flex items-center border-b border-ui-200 bg-ui-50 px-2">
                {TABS.map(({ id, label }) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`px-3 py-2 text-xs font-medium transition-colors ${
                            activeTab === id
                                ? 'border-b-2 border-ui-900 text-ui-900'
                                : 'text-ui-500 hover:text-ui-800'
                        }`}
                    >
                        {label}
                        {id === 'network' && networkEntries.length > 0 && (
                            <span className="ml-1.5 rounded-full bg-ui-200 px-1.5 py-0.5 text-[10px]">
                                {networkEntries.length}
                            </span>
                        )}
                    </button>
                ))}
                <button
                    className="ml-auto px-3 py-2 text-xs text-ui-400 hover:text-ui-700"
                    onClick={onClose}
                >
                    ✕
                </button>
            </div>

            {/* Tab content */}
            <div className="min-h-0 flex-1 overflow-hidden">
                {activeTab === 'overview' && <OverviewTab />}
                {activeTab === 'database' && <DatabaseTab />}
                {activeTab === 'query' && <QueryTab />}
                {activeTab === 'api' && <ApiTab />}
                {activeTab === 'network' && <NetworkTab entries={networkEntries} />}
                {activeTab === 'python' && <PythonTab />}
                {activeTab === 'routes' && <RoutesTab />}
            </div>
        </div>
    )
}
