import { useCallback, useEffect, useRef, useState } from 'react'
import { useDemo, type QueryResult } from './DemoContext'
import { DemoDevTools } from './DemoDevTools'

export function DemoOverlay() {
    const { status, reset } = useDemo()
    const [devToolsOpen, setDevToolsOpen] = useState(false)
    const [resetting, setResetting] = useState(false)

    const handleReset = useCallback(async () => {
        if (resetting) return
        setResetting(true)
        reset()
    }, [reset, resetting])

    useEffect(() => {
        if (status.stage === 'READY') setResetting(false)
    }, [status.stage])

    if (status.stage !== 'READY' && status.stage !== 'RESETTING') return null

    return (
        <>
            {/* Bottom bar */}
            <div className="fixed right-0 bottom-0 left-0 z-[9998] flex h-8 items-center justify-between border-t border-ui-200 bg-ui-50 px-3 text-xs text-ui-600">
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 font-medium text-ui-900">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Demo
                    </span>
                    <span className="text-ui-400">·</span>
                    <span className="font-mono text-ui-500">
                        ops.admin@iotbay.local
                    </span>
                    <span className="text-ui-400">/</span>
                    <span className="font-mono text-ui-500">password</span>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-ui-400">Flask · SQLite · Python WASM</span>
                    <span className="text-ui-300">|</span>
                    <button
                        className="rounded px-1.5 py-0.5 text-ui-600 transition-colors hover:bg-ui-200 hover:text-ui-900 focus-visible:ring-1 focus-visible:ring-ui-500 focus-visible:outline-none"
                        onClick={() => setDevToolsOpen((v) => !v)}
                    >
                        DevTools
                    </button>
                    <button
                        className="rounded px-1.5 py-0.5 text-ui-600 transition-colors hover:bg-ui-200 hover:text-ui-900 focus-visible:ring-1 focus-visible:ring-ui-500 focus-visible:outline-none disabled:opacity-50"
                        onClick={handleReset}
                        disabled={resetting}
                    >
                        {resetting ? 'Resetting…' : 'Reset'}
                    </button>
                </div>
            </div>

            {/* DevTools panel */}
            {devToolsOpen && (
                <DemoDevTools onClose={() => setDevToolsOpen(false)} />
            )}
        </>
    )
}
