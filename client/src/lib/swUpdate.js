// Keep the running app on the latest deploy.
//
// The old setup used the plugin's injected registerSW.js, which registers the
// worker on `load` and never checks again. That is enough for a browser tab
// that gets reloaded, and not enough for anything else:
//
//   - An installed PWA on a phone is suspended and resumed, not reloaded.
//     `load` never fires again, so no update check ever runs and the app can
//     sit on a build from days ago.
//   - A long-lived desktop tab has the same problem.
//   - `updateViaCache` defaults to 'imports', which lets the browser answer the
//     sw.js request from its HTTP cache (capped at 24h).
//
// So registration happens here instead, with three update triggers: on load,
// whenever the app becomes visible again, and hourly while it stays open.
// Checks are cheap — a conditional request for one small file — and the
// browser does nothing further unless the bytes changed.

const UPDATE_INTERVAL_MS = 60 * 60 * 1000;
// A visible app shouldn't fire a check on every tab switch.
const MIN_CHECK_GAP_MS = 60 * 1000;

export function reloadOnServiceWorkerUpdate() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (!import.meta.env.PROD) return; // dev has no worker to update

  // Captured before registering: null on a first-ever visit, set on a repeat
  // one. Reloading when it was null would flash the page for no reason, since
  // the worker taking control there is the first one, not a new build.
  const hadController = Boolean(navigator.serviceWorker.controller);

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // controllerchange can fire more than once; reload at most once. After the
    // reload the new worker is already in control, so nothing re-fires.
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener('load', async () => {
    let reg;
    try {
      // updateViaCache 'none' forces sw.js to be fetched from the network
      // rather than the HTTP cache, so a new build is always seen.
      reg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });
    } catch {
      return; // unsupported or blocked — the app still works, just without offline
    }

    let lastCheck = Date.now();
    const check = () => {
      if (Date.now() - lastCheck < MIN_CHECK_GAP_MS) return;
      lastCheck = Date.now();
      reg.update().catch(() => {});
    };

    // The one that fixes the installed-app case: resuming counts as a check.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
    setInterval(check, UPDATE_INTERVAL_MS);
  });
}

// The build currently running, for the footer. Lets a stale install be
// identified at a glance instead of guessed at.
export const BUILD_ID = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev';
