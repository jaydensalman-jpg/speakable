import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Stamped into the bundle so the running build is identifiable in the UI and
// the worker can log which version took over. Vercel exposes the commit SHA;
// locally fall back to the build time.
const BUILD_ID =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
  new Date().toISOString().slice(0, 16).replace('T', ' ');

export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  plugins: [
    react(),
    // Installable PWA: manifest + service worker so the app can live on a phone
    // home screen and load offline (the Whisper model is cached separately by
    // transformers.js in the browser Cache API — the SW must NOT touch it).
    VitePWA({
      registerType: 'autoUpdate',
      // Register the worker ourselves (lib/swUpdate.js) instead of letting the
      // plugin inject registerSW.js. That injected snippet registers on `load`
      // and never checks again, which is why an installed phone app — resumed
      // rather than reloaded — could sit on an old build for days.
      injectRegister: null,
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
        // references the newest hashed assets; fall back to cache offline after
        // the first visit. (JS/CSS are content-hashed, so they never go stale.)
        // NOTE: do NOT set navigateFallback here — it registers a cache-first
        // NavigationRoute that takes precedence over this NetworkFirst one and
        // reintroduces the stale-page bug.
        navigateFallback: null,
        // Keep index.html OUT of the precache. precacheAndRoute resolves "/"
        // to index.html via directoryIndex and answers it cache-first, and it
        // is registered before the NetworkFirst route below, so a precached
        // index.html wins every navigation and pins the app to the build the
        // worker was installed with. Excluding it lets navigations reach the
        // NetworkFirst route, which still fills the "html" cache on the first
        // visit so offline keeps working.
        globIgnores: ['**/index.html'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html',
              // Only reached when the network is genuinely slow — an offline
              // fetch rejects immediately. 3s was short enough that ordinary
              // cellular fell back to the stale page.
              networkTimeoutSeconds: 10,
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
