import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    // Installable PWA: manifest + service worker so the app can live on a phone
    // home screen and load offline (the Whisper model is cached separately by
    // transformers.js in the browser Cache API — the SW must NOT touch it).
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['mic.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Speakable',
        short_name: 'Speakable',
        description:
          'Private, on-device public speaking coach — record a talk, get scored feedback on fillers, pacing, and delivery. Nothing leaves your device.',
        theme_color: '#faf8f3',
        background_color: '#faf8f3',
        display: 'standalone',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The code-split transformers.js chunk exceeds workbox's 2 MB default.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        // Make a new deploy take over the page immediately instead of the
        // default "wait until every tab is closed" — otherwise returning
        // visitors keep seeing the previous version. Paired with the
        // autoUpdate register type, the page swaps to the new build on load.
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
        // Always fetch the HTML entry from the network when online so the page
        // references the newest hashed assets; fall back to cache offline.
        // (JS/CSS are content-hashed, so they can never go stale.)
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html',
              networkTimeoutSeconds: 3,
            },
          },
        ],
      },
    }),
  ],
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
