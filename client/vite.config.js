import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Pre-bundle transformers.js so its onnxruntime backends register correctly in dev
  // (excluding it leaves onnxruntime-common un-deduped → "registerBackend" undefined).
  optimizeDeps: {
    include: ['@xenova/transformers'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
