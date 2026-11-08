import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const target = process.env.API_TARGET ?? 'http://localhost:8080';

export default defineConfig({
  plugins: [react()],
  resolve: { conditions: ['source'] },
  server: {
    port: 5173,
    proxy: {
      '/api': target,
      '/ws': { target, ws: true },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': target,
      '/ws': { target, ws: true },
    },
  },
  build: { sourcemap: true, chunkSizeWarningLimit: 800 },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.{ts,tsx}'],
  },
});
