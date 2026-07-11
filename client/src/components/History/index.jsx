import { useEffect, useMemo, useState } from 'react';
import { listSessions, deleteSession, dayKey } from '../../lib/history.js';
import { pullReports, deleteReport } from '../../lib/cloudSync.js';
import { InteractiveHoverButton } from '../ui/interactive-hover-button.jsx';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function History({ onOpenReport, onRecord, user }) {
  const [sessions, setSessions] = useState(null); // null = loading
  const [view, setView] = useState(() => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() }; });
  const [selected, setSelected] = useState(() => dayKey(Date.now()));

  // Local sessions first (instant, playable). Signed in: merge in the account's
  // cloud reports — locals win on id collisions since they carry the blob.
  // A cloud fetch failure quietly leaves the local view; never blocks.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = await listSessions();
      if (cancelled) return;
      setSessions(local);
      if (!user) return;
      try {
        const cloud = await pullReports();
        if (cancelled) return;
        const seen = new Set(local.map((s) => s.id));
        const merged = [...local, ...cloud.filter((s) => !seen.has(s.id))].sort(
          (a, b) => b.createdAt - a.createdAt
        );
        setSessions(merged);
      } catch {
        /* offline or cloud down — local view stands */
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const byDay = useMemo(() => {
    const map = {};
    (sessions || []).forEach((s) => { (map[dayKey(s.createdAt)] ||= []).push(s); });
    return map;
  }, [sessions]);

  const stats = useMemo(() => {
    const list = sessions || [];
    const days = new Set(Object.keys(byDay));
    const avg = list.length ? Math.round((list.reduce((a, s) => a + (s.results?.feedback?.overallScore || 0), 0) / list.length) * 10) / 10 : 0;
    return { total: list.length, streak: computeStreak(days), avg };
  }, [sessions, byDay]);

  async function handleDelete(id) {
    await deleteSession(id);
    if (user) deleteReport(id); // fire-and-forget; failures queue in the outbox
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  if (sessions === null) return <div className="py-32 text-center text-ink/40">Loading your history…</div>;

  if (sessions.length === 0) {
    return (
      <div className="animate-rise flex min-h-[60vh] flex-col items-center justify-center text-center">
        <h2 className="font-display text-3xl text-ink">No practices yet</h2>
        <p className="mt-3 max-w-sm text-ink/55">Record your first talk and it’ll show up here — one square per day you practice.</p>
        <InteractiveHoverButton onClick={onRecord} text="Record now" className="mt-7 px-7 py-3" />
      </div>
    );
  }

  const firstWeekday = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const todayKey = dayKey(Date.now());
  const selectedSessions = byDay[selected] || [];

  const shiftMonth = (delta) => setView((v) => {
    const d = new Date(v.y, v.m + delta, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  return (
    <div className="animate-rise space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-3xl text-ink tracking-tight">Your practice</h2>
          <p className="text-sm text-ink/45 mt-0.5">Every day you practice counts.</p>
        </div>
        <InteractiveHoverButton onClick={onRecord} text="New recording" className="px-5 py-2.5 text-sm" />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Stat i={0} label="Practices" value={stats.total} />
        <Stat i={1} label="Day streak" value={stats.streak === 0 ? '—' : `${stats.streak}🔥`} />
        <Stat i={2} label="Avg score" value={stats.avg ? `${stats.avg}/10` : '—'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Calendar */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => shiftMonth(-1)} className="w-8 h-8 rounded-full hover:bg-sand flex items-center justify-center text-ink/50" aria-label="Previous month">‹</button>
            <span className="font-display text-lg text-ink">{MONTHS[view.m]} {view.y}</span>
            <button onClick={() => shiftMonth(1)} className="w-8 h-8 rounded-full hover:bg-sand flex items-center justify-center text-ink/50" aria-label="Next month">›</button>
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {WEEKDAYS.map((d, i) => <span key={i} className="text-[11px] font-medium text-ink/35 py-1">{d}</span>)}
            {cells.map((day, i) => {
              if (!day) return <span key={i} />;
              const key = `${view.y}-${String(view.m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const count = byDay[key]?.length || 0;
              const isToday = key === todayKey;
              const isSel = key === selected;
              return (
                <button
                  key={i}
                  onClick={() => setSelected(key)}
                  style={{ animationDelay: `${i * 12}ms` }}
                  className={`animate-pop aspect-square rounded-xl text-sm font-medium flex items-center justify-center transition-transform duration-200 relative hover:scale-[1.08] active:scale-95
                    ${count ? intensityClass(count) : 'text-ink/40 hover:bg-sand'}
                    ${isSel ? 'ring-2 ring-brand-500 ring-offset-1 ring-offset-white scale-[1.04]' : ''}
                    ${isToday && !isSel ? 'ring-1 ring-ink/20' : ''}`}
                >
                  {day}
                  {count > 1 && <span className="absolute bottom-0.5 right-1 text-[9px] opacity-80">{count}</span>}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-end gap-1.5 mt-4 text-[11px] text-ink/40">
            Less
            <span className="w-3 h-3 rounded bg-sand" />
            <span className="w-3 h-3 rounded bg-brand-200" />
            <span className="w-3 h-3 rounded bg-brand-400" />
            <span className="w-3 h-3 rounded bg-brand-600" />
            More
          </div>
        </div>

        {/* Selected day */}
        <div>
          <h3 className="font-display text-lg text-ink mb-3">{formatDay(selected)}</h3>
          {selectedSessions.length === 0 ? (
            <div className="card text-center text-sm text-ink/45 py-10">No practice on this day.</div>
          ) : (
            <div className="space-y-3">
              {selectedSessions.map((s, i) => (
                <SessionRow key={s.id} index={i} session={s} onOpen={() => onOpenReport(s)} onDelete={() => handleDelete(s.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, i = 0 }) {
  return (
    <div className="stat-card items-center text-center animate-rise" style={{ animationDelay: `${i * 70}ms` }}>
      <span className="text-2xl font-bold text-ink tabular-nums">{value}</span>
      <span className="text-xs text-ink/45 font-medium">{label}</span>
    </div>
  );
}

function SessionRow({ session, onOpen, onDelete, index = 0 }) {
  const r = session.results || {};
  const score = r.feedback?.overallScore ?? '—';
  const fillers = Object.values(r.fillerWordCounts || {}).reduce((a, b) => a + b, 0);
  const time = new Date(session.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return (
    <div className="card lift animate-rise flex items-center gap-4 py-4" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 shrink-0">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
          {session.mediaType === 'video' ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m0 0H9m3 0h3M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
          )}
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink">{time} · Score {score}/10</p>
        <p className="text-xs text-ink/45 mt-0.5">
          {formatDuration(r.duration)} · {r.words?.length ?? 0} words · {fillers} filler{fillers === 1 ? '' : 's'}
        </p>
      </div>
      <button onClick={onOpen} className="text-sm font-semibold text-brand-600 hover:text-brand-700 shrink-0">View report</button>
      <button onClick={onDelete} className="w-8 h-8 rounded-full text-ink/30 hover:text-red-500 hover:bg-red-50 flex items-center justify-center shrink-0" aria-label="Delete">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-7 0v11a1 1 0 001 1h6a1 1 0 001-1V7" /></svg>
      </button>
    </div>
  );
}

function intensityClass(count) {
  if (count >= 3) return 'bg-brand-600 text-white';
  if (count === 2) return 'bg-brand-400 text-white';
  return 'bg-brand-200 text-brand-800';
}

function computeStreak(daySet) {
  if (!daySet.size) return 0;
  const d = new Date();
  if (!daySet.has(dayKey(d.getTime()))) {
    d.setDate(d.getDate() - 1);
    if (!daySet.has(dayKey(d.getTime()))) return 0; // nothing today or yesterday
  }
  let streak = 0;
  while (daySet.has(dayKey(d.getTime()))) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}

function formatDay(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatDuration(s) {
  if (!s) return '—';
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}
