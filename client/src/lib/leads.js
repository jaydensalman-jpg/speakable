import { supabase } from './supabase.js';
import { visitSource } from './source.js';

// Email-gate signups → Supabase `leads` (insert-only from the browser, the same
// write-only pattern as `metrics`; see supabase/schema.sql). Kept SEPARATE from
// metrics on purpose: a lead row is an email plus where the visit came from, and
// never carries the `speakable-anon` id or any practice numbers.
//
// Only an email submitted through the gate is ever sent. `speakable-email`
// values saved by builds before October 2026 were given under copy that said
// nothing about storing them, so they stay on the device: the pending marker is
// written at submit time and is the only thing a retry reads.
//
// Best-effort like metrics — it never blocks or delays recording, and does
// nothing when Supabase isn't configured.

const PENDING_KEY = 'speakable-lead-pending';

function send(email) {
  supabase
    .from('leads')
    .insert({ email, source: visitSource() })
    .then(
      ({ error }) => {
        if (error) return; // keep the marker; retried on the next app start
        try {
          localStorage.removeItem(PENDING_KEY);
        } catch {
          /* storage blocked — nothing to clear */
        }
      },
      () => {}
    );
}

// Called when the gate is submitted with an email.
export function saveLead(email) {
  if (!supabase || !email) return;
  try {
    localStorage.setItem(PENDING_KEY, email);
  } catch {
    /* storage blocked — still send once, just without a retry */
  }
  send(email);
}

// A signup that didn't reach the server (offline, or the table not created
// yet) is retried once per app start.
export function retryPendingLead() {
  if (!supabase) return;
  let email = null;
  try {
    email = localStorage.getItem(PENDING_KEY);
  } catch {
    return;
  }
  if (email) send(email);
}
