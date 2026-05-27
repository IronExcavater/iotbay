import { type DemoStage, type DemoStatus, useDemo } from './DemoContext'

const STAGES: { stage: DemoStage; label: string }[] = [
    { stage: 'LOADING_PYODIDE', label: 'Loading Python runtime' },
    { stage: 'INSTALLING_PACKAGES', label: 'Installing Flask & dependencies' },
    { stage: 'LOADING_SOURCE', label: 'Loading application source' },
    { stage: 'RESTORING_DB', label: 'Checking saved session' },
    { stage: 'STARTING_FLASK', label: 'Starting Flask application' },
]

const STAGE_ORDER: DemoStage[] = [
    'REGISTERING',
    'LOADING_PYODIDE',
    'INSTALLING_PACKAGES',
    'LOADING_SOURCE',
    'RESTORING_DB',
    'STARTING_FLASK',
    'READY',
]

function stageIndex(stage: DemoStage) {
    return STAGE_ORDER.indexOf(stage)
}

function StageRow({
    stage,
    label,
    currentStage,
}: {
    stage: DemoStage
    label: string
    currentStage: DemoStage
}) {
    const current = stageIndex(currentStage)
    const mine = stageIndex(stage)
    const done = current > mine
    const active = current === mine

    return (
        <div className="flex items-center gap-3 text-sm">
            <span className="w-5 text-center">
                {done ? (
                    <span className="text-green-500">✓</span>
                ) : active ? (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-ui-400 border-t-ui-700" />
                ) : (
                    <span className="text-ui-400">·</span>
                )}
            </span>
            <span className={done ? 'text-ui-600' : active ? 'text-ui-900' : 'text-ui-400'}>
                {label}
            </span>
        </div>
    )
}

export function DemoLoadingScreen() {
    const { status } = useDemo()

    if (status.stage === 'READY') return null

    if (status.stage === 'RESETTING') {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-ui-0/80 backdrop-blur-sm">
                <div className="flex items-center gap-3 rounded-xl border border-ui-200 bg-ui-0 px-6 py-4 shadow-xl">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-ui-300 border-t-ui-900" />
                    <span className="text-sm text-ui-700">Resetting demo data…</span>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-ui-0">
            <div className="flex w-full max-w-sm flex-col gap-8 px-8 py-12">
                {/* Brand */}
                <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium tracking-widest text-ui-400 uppercase">
                        Demo
                    </p>
                    <h1 className="text-2xl font-semibold tracking-tight text-ui-900">
                        IoTBay
                    </h1>
                    <p className="text-sm text-ui-500">
                        Flask · SQLite · Python WASM
                    </p>
                </div>

                {/* Stage list */}
                {status.stage !== 'ERROR' && (
                    <div className="flex flex-col gap-3">
                        {STAGES.map(({ stage, label }) => (
                            <StageRow
                                key={stage}
                                stage={stage}
                                label={label}
                                currentStage={status.stage}
                            />
                        ))}
                    </div>
                )}

                {/* Error */}
                {status.stage === 'ERROR' && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                        <p className="text-sm font-medium text-red-700">
                            Failed to start demo
                        </p>
                        <p className="mt-1 text-xs text-red-600">{status.error}</p>
                        <button
                            type="button"
                            className="mt-3 text-xs font-medium text-red-700 underline"
                            onClick={() => window.location.reload()}
                        >
                            Reload page
                        </button>
                    </div>
                )}

                {/* Progress bar */}
                {status.stage !== 'ERROR' && (
                    <div
                        className="flex flex-col gap-2"
                        // eslint-disable-next-line react/forbid-dom-props
                        style={{ '--progress': `${status.progress}%` } as React.CSSProperties}
                    >
                        <div className="h-1 w-full overflow-hidden rounded-full bg-ui-200">
                            <div className="demo-progress h-full rounded-full bg-ui-900 transition-all duration-500" />
                        </div>
                        <p className="text-xs text-ui-400">{status.label}…</p>
                    </div>
                )}

                {/* Info tip */}
                {status.stage !== 'ERROR' && (
                    <p className="text-xs text-ui-400">
                        This demo runs a real Flask app inside your browser via Python WebAssembly.
                        Data is stored in IndexedDB and private to your browser.
                    </p>
                )}
            </div>
        </div>
    )
}
