// IoTBay Demo Service Worker
// Intercepts /api/* requests and routes them through a real Flask app
// running inside Pyodide (Python WASM) with SQLite persisted to IndexedDB.

const PYODIDE_VERSION = '0.27.5'
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`
const DB_IDB_KEY = 'iotbay_demo_db'
const IDB_NAME = 'iotbay_demo'
const CHANNEL = new BroadcastChannel('iotbay-demo')

let pyodide = null
let isReady = false

// ─── IndexedDB helpers ───────────────────────────────────────────────────────

function idbOpen() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(IDB_NAME, 1)
        req.onupgradeneeded = (e) => e.target.result.createObjectStore('kv')
        req.onsuccess = (e) => resolve(e.target.result)
        req.onerror = () => reject(req.error)
    })
}

async function idbGet(key) {
    const db = await idbOpen()
    return new Promise((resolve, reject) => {
        const tx = db.transaction('kv', 'readonly')
        const req = tx.objectStore('kv').get(key)
        req.onsuccess = () => resolve(req.result ?? null)
        req.onerror = () => reject(req.error)
    })
}

async function idbSet(key, value) {
    const db = await idbOpen()
    return new Promise((resolve, reject) => {
        const tx = db.transaction('kv', 'readwrite')
        tx.objectStore('kv').put(value, key)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
    })
}

async function idbDelete(key) {
    const db = await idbOpen()
    return new Promise((resolve, reject) => {
        const tx = db.transaction('kv', 'readwrite')
        tx.objectStore('kv').delete(key)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
    })
}

// ─── Status broadcasting ─────────────────────────────────────────────────────

function broadcast(type, data = {}) {
    CHANNEL.postMessage({ type, ...data })
}

// ─── Pyodide + Flask initialisation ──────────────────────────────────────────

async function initDemo() {
    try {
        broadcast('STAGE', { stage: 'LOADING_PYODIDE', label: 'Loading Python runtime (Pyodide)' })
        importScripts(PYODIDE_CDN + 'pyodide.js')
        pyodide = await loadPyodide({ indexURL: PYODIDE_CDN })

        broadcast('STAGE', { stage: 'INSTALLING_PACKAGES', label: 'Installing Flask & dependencies' })
        await pyodide.loadPackage(['pydantic', 'micropip'])
        const micropip = pyodide.pyimport('micropip')
        await micropip.install(['flask', 'phonenumbers', 'babel', 'pydantic-settings'])

        broadcast('STAGE', { stage: 'LOADING_SOURCE', label: 'Loading application source' })
        const bundleResp = await fetch('./demo-bundle.json')
        if (!bundleResp.ok) throw new Error(`Failed to load demo bundle: ${bundleResp.status}`)
        const bundle = await bundleResp.json()

        for (const [relPath, content] of Object.entries(bundle.files)) {
            const fullPath = `/demo/${relPath}`
            const dir = fullPath.slice(0, fullPath.lastIndexOf('/'))
            try { pyodide.FS.mkdir(dir) } catch { /* already exists */ }
            pyodide.FS.writeFile(fullPath, content)
        }

        await pyodide.runPythonAsync(`
import sys
sys.path.insert(0, '/demo')

# Disable phonenumber validation strictness in demo (avoids env-specific issues)
import os
os.environ.setdefault('IOTBAY_API_KEY', '')
os.environ.setdefault('IOTBAY_SENDER', '')
os.environ.setdefault('IOTBAY_SMTP_HOST', '')
os.environ.setdefault('IOTBAY_GOOGLE_MAPS_API_KEY', '')
`)

        broadcast('STAGE', { stage: 'RESTORING_DB', label: 'Checking saved session' })
        const savedDb = await idbGet(DB_IDB_KEY)
        if (savedDb) {
            try {
                pyodide.FS.mkdir('/demo/db')
            } catch { /* exists */ }
            pyodide.FS.writeFile('/demo/db/demo.sqlite3', new Uint8Array(savedDb))
        }

        broadcast('STAGE', { stage: 'STARTING_FLASK', label: 'Starting Flask application' })
        await pyodide.runPythonAsync(`
import json

from src.app import create_app as _create_app

_app = _create_app('/demo/config/demo.json')
_ctx = _app.app_context()
_ctx.push()
_client = _app.test_client()
_client.__enter__()

def _handle_request(method, path, body, cookies, content_type):
    headers = {}
    if cookies:
        headers['Cookie'] = cookies
    kwargs = {'headers': headers}
    if body and 'application/json' in content_type:
        kwargs['data'] = body
        kwargs['content_type'] = 'application/json'
    elif body:
        kwargs['data'] = body
        if content_type:
            kwargs['content_type'] = content_type

    resp = getattr(_client, method.lower())(path, **kwargs)

    set_cookies = []
    resp_headers = {}
    for name, val in resp.headers:
        low = name.lower()
        if low == 'set-cookie':
            set_cookies.append(val)
        else:
            resp_headers[name] = val

    return {
        'status': resp.status_code,
        'headers': resp_headers,
        'body': resp.data.decode('utf-8'),
        'set_cookie': set_cookies,
    }
`)

        if (!savedDb) {
            try {
                const dbBytes = pyodide.FS.readFile('/demo/db/demo.sqlite3')
                await idbSet(DB_IDB_KEY, dbBytes.buffer)
            } catch { /* no db yet */ }
        }

        isReady = true
        broadcast('READY')
    } catch (err) {
        broadcast('ERROR', { message: String(err) })
        throw err
    }
}

// ─── Service worker lifecycle ─────────────────────────────────────────────────

self.addEventListener('install', (event) => {
    event.waitUntil(initDemo().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim())
})

// ─── Fetch interception ───────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url)
    if (!url.pathname.startsWith('/api/') && !url.pathname.includes('/api/')) return
    if (!isReady) return
    event.respondWith(handleApiRequest(event.request))
})

const WRITE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE'])

async function handleApiRequest(request) {
    const url = new URL(request.url)
    const path = url.pathname + url.search
    const method = request.method.toUpperCase()
    let body = ''
    if (!['GET', 'HEAD'].includes(method)) {
        body = await request.text()
    }
    const cookies = request.headers.get('Cookie') ?? ''
    const contentType = request.headers.get('Content-Type') ?? ''

    pyodide.globals.set('_req_method', method)
    pyodide.globals.set('_req_path', path)
    pyodide.globals.set('_req_body', body)
    pyodide.globals.set('_req_cookies', cookies)
    pyodide.globals.set('_req_ct', contentType)

    let result
    try {
        const pyResult = await pyodide.runPythonAsync(
            '_handle_request(_req_method, _req_path, _req_body, _req_cookies, _req_ct)'
        )
        result = pyResult.toJs({ dict_converter: Object.fromEntries })
    } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        })
    }

    if (WRITE_METHODS.has(method)) {
        persistDb().catch(() => {})
    }

    const headers = new Headers()
    const resultHeaders = result.get('headers') ?? {}
    const ct = resultHeaders['Content-Type'] ?? resultHeaders['content-type'] ?? 'application/json'
    headers.set('Content-Type', ct)
    headers.set('Access-Control-Allow-Origin', '*')

    const setCookies = result.get('set_cookie') ?? []
    for (const cookie of setCookies) {
        headers.append('Set-Cookie', cookie)
    }

    return new Response(result.get('body') ?? '', {
        status: result.get('status') ?? 200,
        headers,
    })
}

async function persistDb() {
    try {
        const dbBytes = pyodide.FS.readFile('/demo/db/demo.sqlite3')
        await idbSet(DB_IDB_KEY, dbBytes.buffer)
    } catch { /* db file may not exist if no writes yet */ }
}

// ─── Message handling (from DemoContext / DevTools) ───────────────────────────

self.addEventListener('message', (event) => {
    const { type, sql } = event.data ?? {}
    const port = event.ports?.[0]

    if (type === 'RESET_DEMO') {
        handleReset()
    }

    if (type === 'QUERY' && sql && port) {
        handleQuery(sql)
            .then((result) => port.postMessage({ result }))
            .catch((err) => port.postMessage({ error: String(err) }))
    }

    if (type === 'STATUS' && port) {
        port.postMessage({ isReady })
    }

    if (type === 'LIST_TABLES' && port) {
        handleQuery(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        )
            .then((result) => port.postMessage({ result }))
            .catch((err) => port.postMessage({ error: String(err) }))
    }

    if (type === 'TABLE_COUNT' && port) {
        const { table } = event.data
        handleQuery(`SELECT COUNT(*) as count FROM "${table}"`)
            .then((result) => port.postMessage({ result }))
            .catch((err) => port.postMessage({ error: String(err) }))
    }

    if (type === 'LIST_ROUTES' && port) {
        handleListRoutes()
            .then((result) => port.postMessage({ result }))
            .catch((err) => port.postMessage({ error: String(err) }))
    }

    if (type === 'PYTHON_EVAL' && port) {
        const { code } = event.data
        handlePythonEval(code)
            .then((out) => port.postMessage(out))
            .catch((err) => port.postMessage({ out: String(err), error: true }))
    }
})

async function handleReset() {
    isReady = false
    broadcast('RESETTING', { label: 'Resetting demo data' })
    try {
        await idbDelete(DB_IDB_KEY)
        await pyodide.runPythonAsync(`
import os
db_path = '/demo/db/demo.sqlite3'
if os.path.exists(db_path):
    os.remove(db_path)
from src.db import seed_apply
seed_apply(db_path)
`)
        await persistDb()
        isReady = true
        broadcast('READY', { reset: true })
    } catch (err) {
        broadcast('ERROR', { message: String(err) })
    }
}

async function handleListRoutes() {
    if (!pyodide) throw new Error('Pyodide not ready')
    const pyResult = await pyodide.runPythonAsync(`
_routes = []
for _rule in _app.url_map.iter_rules():
    _routes.append({
        'methods': ', '.join(sorted(m for m in _rule.methods if m not in ('HEAD', 'OPTIONS'))),
        'url': _rule.rule,
        'endpoint': _rule.endpoint,
    })
{'rows': sorted(_routes, key=lambda r: r['url']), 'columns': ['methods', 'url', 'endpoint']}
`)
    return pyResult.toJs({ dict_converter: Object.fromEntries })
}

async function handlePythonEval(code) {
    if (!pyodide) throw new Error('Pyodide not ready')
    pyodide.globals.set('_eval_code', code)
    const pyResult = await pyodide.runPythonAsync(`
import io, sys, traceback
_buf = io.StringIO()
_old_stdout = sys.stdout
_old_stderr = sys.stderr
sys.stdout = _buf
sys.stderr = _buf
_eval_error = False
try:
    _compiled = compile(_eval_code, '<devtools>', 'exec')
    exec(_compiled, globals())
except Exception:
    traceback.print_exc()
    _eval_error = True
finally:
    sys.stdout = _old_stdout
    sys.stderr = _old_stderr
{'out': _buf.getvalue(), 'error': _eval_error}
`)
    return pyResult.toJs({ dict_converter: Object.fromEntries })
}

async function handleQuery(sql) {
    if (!pyodide) throw new Error('Pyodide not ready')
    pyodide.globals.set('_query_sql', sql)
    const pyResult = await pyodide.runPythonAsync(`
import sqlite3 as _sqlite3
_conn = _sqlite3.connect('/demo/db/demo.sqlite3')
_conn.row_factory = _sqlite3.Row
try:
    _cur = _conn.execute(_query_sql)
    _rows = [dict(_r) for _r in _cur.fetchall()]
    _cols = [_d[0] for _d in _cur.description] if _cur.description else []
    {'rows': _rows, 'columns': _cols, 'rowcount': _cur.rowcount}
except Exception as _e:
    {'error': str(_e), 'rows': [], 'columns': []}
finally:
    _conn.close()
`)
    return pyResult.toJs({ dict_converter: Object.fromEntries })
}
