import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
    // Local dev: /api -> NestJS. Deployed preview: ingress routes /api -> :8001 directly.
    proxy: { '/api': 'http://127.0.0.1:8001' },
  },
});
