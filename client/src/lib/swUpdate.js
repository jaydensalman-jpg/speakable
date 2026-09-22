// Make a new deploy actually appear, instead of one visit later.
//
// vite-plugin-pwa registers the worker with autoUpdate + skipWaiting +
// clientsClaim, so a new build's service worker installs and takes control
// straight away. What none of that does is refresh the page already open: the
// previous build's HTML and JS are still in memory and keep running. The result
// is the "I opened the link and it's still the old version" bug, which looks
// like a broken deploy but is entirely client-side.
//
// So: reload once when control passes to a NEW worker. Two guards.
//   1. Only when a controller already existed. A first-ever visit has none, and
//      reloading there would flash the page for no reason.
//   2. Only once per page life, since controllerchange can fire more than once.
// After the reload the new worker is the controller, so nothing fires again and
// there is no loop.
export function reloadOnServiceWorkerUpdate() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  // Captured before any listener: on a fresh visit this is null.
  if (!navigator.serviceWorker.controller) return;

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });
}
