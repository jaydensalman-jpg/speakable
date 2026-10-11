// Where this visitor first came from, for attributing email-gate signups (see
// lib/leads.js). Read from the landing URL's `utm_source` (or the shorter
// `src`), e.g. an Instagram bio link ending in ?utm_source=instagram.
//
// First touch wins and is kept in localStorage, because the email gate often
// shows on a later visit than the one that carried the link. Only a short
// lowercase slug is kept — never the full URL — and its shape matches the
// `leads.source` check constraint in supabase/schema.sql.

const KEY = 'speakable-source';

function slug(value) {
  const s = (value || '').toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 40);
  return s || null;
}

// Call once at startup, before anything can rewrite the URL.
export function captureSource() {
  try {
    if (localStorage.getItem(KEY)) return;
    const params = new URLSearchParams(window.location.search);
    const source = slug(params.get('utm_source') || params.get('src'));
    if (source) localStorage.setItem(KEY, source);
  } catch {
    /* storage blocked — signups just go unattributed */
  }
}

export function visitSource() {
  try {
    return slug(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}
