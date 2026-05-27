import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const apiRoot = resolve(__dirname, '../api')

// ─── Demo bundle plugin ────────────────────────────────────────────────────────
// Scans api/src, api/migrations, api/db, api/config and emits demo-bundle.json
// so the service worker can write the Python source into Pyodide's virtual FS.

const EXCLUDED_DIRS = new Set(['__pycache__', '.venv', 'data', 'test'])
const INCLUDED_EXTENSIONS = new Set(['.py', '.sql', '.json', '.txt'])

function scanDir(dir) {
    if (!existsSync(dir)) return {}
    const files = {}
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('.')) continue
        const full = join(dir, entry.name)
        if (entry.isDirectory()) {
            if (EXCLUDED_DIRS.has(entry.name)) continue
            Object.assign(files, scanDir(full))
        } else {
            const ext = entry.name.slice(entry.name.lastIndexOf('.'))
            if (!INCLUDED_EXTENSIONS.has(ext)) continue
            const rel = relative(apiRoot, full).replaceAll('\\', '/')
            files[rel] = readFileSync(full, 'utf8')
        }
    }
    return files
}

function buildDemoBundle() {
    return JSON.stringify({
        files: {
            ...scanDir(join(apiRoot, 'src')),
            ...scanDir(join(apiRoot, 'migrations')),
            ...scanDir(join(apiRoot, 'db')),
            ...scanDir(join(apiRoot, 'config')),
        },
    })
}

function demoBundlePlugin() {
    return {
        name: 'demo-bundle',
        configureServer(server) {
            server.middlewares.use('/demo-bundle.json', (_req, res) => {
                res.setHeader('Content-Type', 'application/json')
                res.end(buildDemoBundle())
            })
        },
        generateBundle() {
            this.emitFile({
                type: 'asset',
                fileName: 'demo-bundle.json',
                source: buildDemoBundle(),
            })
        },
    }
}

// ─── Vite config ──────────────────────────────────────────────────────────────

export default defineConfig({
    base: process.env.VITE_BASE_PATH || '/',
    build: {
        cssCodeSplit: false,
    },
    envDir: '..',
    envPrefix: ['VITE_', 'IOTBAY_'],
    plugins: [react(), tailwindcss(), demoBundlePlugin()],
    resolve: {
        alias: {
            '@app': fileURLToPath(new URL('./src/app', import.meta.url)),
            '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
            '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
        },
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:5001',
                changeOrigin: true,
            },
        },
    },
})
