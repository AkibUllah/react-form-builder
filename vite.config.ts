import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// BASE_PATH lets the same bundle be served from a sub-path (e.g. GitHub Pages: /react-form-builder/).
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5174, open: false },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react';
          if (id.includes('node_modules/@dnd-kit/')) return 'dnd';
          if (/node_modules\/(react-hook-form|@hookform|zod)\//.test(id)) return 'forms';
          return undefined;
        },
      },
    },
  },
});
