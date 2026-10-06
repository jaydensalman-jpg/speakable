// Google Analytics 4, wired for a single-page app.
//
// Two things make this different from a normal GA install:
//
// 1. GA's automatic page tracking is close to useless here. Speakable never
//    changes URL — App.jsx is a state machine (home → idle → recording →
//    processing → results) — so GA would record every visitor as one view of
//    "/" and tell you nothing about where people drop. The custom funnel
//    events below are the actual value.
//
// 2. Nothing loads unless VITE_GA_ID is set. No measurement id in the repo, no
//    Google script for anyone until you configure one, and the whole module
//    degrades to no-ops so call sites never need a guard.
//
// Privacy: events carry NUMBERS and short enum strings only — never the
// transcript, the email, the recording, or the `speakable-anon` id. That keeps
// this consistent with the rest of the app, where the only content that ever
// leaves the device is a report you explicitly synced.

const GA_ID = import.meta.env.VITE_GA_ID;

let enabled = false;

export function initAnalytics() {
  if (!GA_ID) return; // not configured — stay completely inert
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Honour Do Not Track. GA4 sets cookies, so a user who has asked not to be
  // tracked should not get them.
  const dnt = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
  if (dnt === '1' || dnt === 'yes') return;

  try {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    // anonymize_ip trims the last octet before storage.
    window.gtag('config', GA_ID, { anonymize_ip: true });

    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(s);

    enabled = true;
  } catch {
    /* analytics must never break the app */
  }
}

// Fire one funnel event. Safe to call anywhere: a no-op when unconfigured,
// when the user set Do Not Track, or if the Google script failed to load.
export function track(event, params) {
  if (!enabled || typeof window === 'undefined' || !window.gtag) return;
  try {
    window.gtag('event', event, params || {});
  } catch {
    /* never throw from a metrics call */
  }
}
