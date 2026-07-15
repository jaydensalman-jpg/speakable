import { supabase } from './supabase.js';

// Anonymous, aggregate-only usage metrics — the ONLY purpose is proving impact
// ("how many sessions ran" and "how much did filler rate drop from take 1 to 5").
//
// Privacy, deliberately: this is SEPARATE from accounts. The id here is a random
// token in localStorage, never the email or auth user. We log ONLY numbers
// (score, filler %, WPM, eye %) — never transcript, audio, or any content. The
// `metrics` table is write-only from the browser (RLS allows INSERT, denies
// SELECT); aggregates are read by the project owner in the Supabase dashboard.
// Fire-and-forget: it never blocks, delays, or errors the app, and it does
// nothing at all when Supabase isn't configured.

const ANON_KEY = 'speakable-anon';

function anonId() {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return null; // private mode / storage blocked → skip metrics silently
  }
}

// Log one completed session. `ordinal` is this device's session number (1st,
// 2nd, …) so trends like "take 1 vs take 5" can be computed in aggregate.
export function logSession({ ordinal, overallScore, fillerPct, wpm, eyePct }) {
  if (!supabase) return;
  const id = anonId();
  if (!id) return;
  supabase
    .from('metrics')
    .insert({
      anon_id: id,
      ordinal,
      overall_score: overallScore ?? null,
      filler_pct: fillerPct ?? null,
      wpm: wpm ?? null,
      eye_pct: eyePct ?? null,
    })
    .then(() => {}, () => {}); // best-effort; metrics are non-essential
}
