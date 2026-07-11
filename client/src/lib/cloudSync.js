import { supabase } from './supabase.js';
import { listSessions } from './history.js';

// Report sync — the privacy split lives here: only the REPORT (results JSON,
// scores, transcript, eye contact, createdAt) ever goes to Supabase. The
// media blob stays in IndexedDB on the device that recorded it, always.
//
// Failures never block the UI: a failed push/delete lands in a localStorage
// outbox and is retried on login, app start, and browser 'online' events.

const OUTBOX_KEY = 'speakcoach-outbox';

function readOutbox() {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_KEY)) || [];
  } catch {
    return [];
  }
}

function writeOutbox(list) {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(list));
  } catch {
    // Storage full/blocked — the report is still saved locally; sync is best-effort.
  }
}

// One pending entry per session id; a later op on the same id replaces the earlier.
function enqueue(entry) {
  writeOutbox([...readOutbox().filter((e) => e.id !== entry.id), entry]);
}

function toRow(session, userId) {
  return {
    id: session.id,
    user_id: userId,
    created_at: session.createdAt,
    media_type: session.mediaType,
    results: session.results,
  };
}

function rowToSession(row) {
  // Same shape lib/history.js sessions have — blob:null marks it cloud-only.
  return {
    id: row.id,
    createdAt: Number(row.created_at),
    mediaType: row.media_type,
    results: row.results,
    blob: null,
    cloud: true,
  };
}

export async function pushReport(session, userId) {
  if (!supabase || !userId) return;
  const row = toRow(session, userId);
  const { error } = await supabase.from('sessions').upsert(row);
  if (error) enqueue({ op: 'upsert', id: session.id, payload: row });
}

export async function deleteReport(id) {
  if (!supabase) return;
  const { error } = await supabase.from('sessions').delete().eq('id', id);
  if (error) enqueue({ op: 'delete', id });
}

// All of the signed-in user's reports (RLS scopes the query server-side).
export async function pullReports() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('sessions').select('*');
  if (error) throw error;
  return (data || []).map(rowToSession);
}

// On login: everything recorded on this device joins the account.
// Upsert on the primary key makes this idempotent — no duplicate rows.
export async function mergeUpLocal(userId) {
  if (!supabase || !userId) return;
  const locals = await listSessions();
  for (const s of locals) await pushReport(s, userId);
}

export async function flushOutbox(userId) {
  if (!supabase || !userId) return;
  const pending = readOutbox();
  if (!pending.length) return;
  const remaining = [];
  for (const e of pending) {
    const { error } =
      e.op === 'upsert'
        ? await supabase.from('sessions').upsert({ ...e.payload, user_id: userId })
        : await supabase.from('sessions').delete().eq('id', e.id);
    if (error) remaining.push(e);
  }
  writeOutbox(remaining);
}
