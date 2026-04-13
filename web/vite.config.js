import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
    envDir: '..',
    // Reuse the workspace env file so the web app can read the same local API
    // access key value the backend loads from `.env`.
    envPrefix: ['VITE_', 'IOTBAY_'],
    plugins: [react(), tailwindcss()],
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
