import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
    base: process.env.VITE_BASE_PATH || '/',
    build: {
        cssCodeSplit: false,
    },
    envDir: '..',
    // Reuse the workspace env file so the web app can read the same local API
    // access key value the backend loads from `.env`.
    envPrefix: ['VITE_', 'IOTBAY_'],
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            '@app': fileURLToPath(new URL('./src/app', import.meta.url)),
            '@features': fileURLToPath(
                new URL('./src/features', import.meta.url)
            ),
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
});
