import { useMemo } from 'react';
import { LineChart, Line, YAxis, ResponsiveContainer } from 'recharts';

// Progress = how a user is trending across their saved takes. Reads only the
// sessions already loaded by History (local + cloud), computes each take's key
// numbers, and shows a plain improvement headline plus one mini trend per
// metric. No new data source, no scoring changes. Gracefully handles 0/1 takes.

const BRAND = '#e0714f';

// Pull the four comparable numbers out of a saved session's report.
function takeMetrics(s) {
  const r = s.results || {};
  const wordCount = r.words?.length || 0;
  const fillerTotal = Object.values(r.fillerWordCounts || {}).reduce((a, b) => a + b, 0);
  return {
    score: r.feedback?.overallScore ?? null,
    fillerPct: wordCount ? Math.round((fillerTotal / wordCount) * 1000) / 10 : null,
    wpm: r.avgWpm ?? null,
    eyePct: r.eyeContact?.contactPct ?? null,
  };
}

export default function ProgressView({ sessions }) {
  const takes = useMemo(
    () =>
      [...(sessions || [])]
        .filter((s) => s.results?.feedback?.overallScore != null)
        .sort((a, b) => a.createdAt - b.createdAt)
        .map(takeMetrics),
    [sessions]
  );

  if (takes.length === 0) {
    return <div className="card text-center text-sm text-ink/45 py-12">No scored takes yet.</div>;
  }

  if (takes.length === 1) {
    return (
      <div className="card text-center py-10">
        <p className="font-display text-2xl text-ink">One take so far</p>
        <p className="mt-2 text-sm text-ink/55 max-w-sm mx-auto">
          Record a few more and this page shows how your score, fillers, pace, and eye contact
          move over time.
        </p>
      </div>
    );
  }

  const first = takes[0];
  const last = takes.at(-1);
  const n = takes.length;
  const eyeTakes = takes.filter((t) => t.eyePct != null);

  return (
    <div className="space-y-5">
      <Headline first={first} last={last} n={n} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TrendCard
          label="Overall score"
          series={takes.map((t) => t.score)}
          domain={[0, 10]}
          fmt={(v) => `${v}/10`}
          delta={deltaHigherBetter(first.score, last.score, (d) => `${d > 0 ? '+' : ''}${d.toFixed(1)} pts`)}
        />
        <TrendCard
          label="Filler rate"
          series={takes.map((t) => t.fillerPct)}
          domain={[0, Math.max(...takes.map((t) => t.fillerPct || 0), 5)]}
          fmt={(v) => `${v}%`}
          delta={deltaLowerBetter(first.fillerPct, last.fillerPct)}
        />
        <TrendCard
          label="Pace"
          series={takes.map((t) => t.wpm)}
          domain={[Math.min(...takes.map((t) => t.wpm || 120), 100) - 10, Math.max(...takes.map((t) => t.wpm || 140), 160) + 10]}
          fmt={(v) => `${v} WPM`}
          delta={deltaPace(first.wpm, last.wpm)}
        />
        {eyeTakes.length >= 2 && (
          <TrendCard
            label="Eye contact"
            series={takes.map((t) => t.eyePct)}
            domain={[0, 100]}
            fmt={(v) => `${v}%`}
            delta={deltaHigherBetter(
              eyeTakes[0].eyePct,
              eyeTakes.at(-1).eyePct,
              (d) => `${d > 0 ? '+' : ''}${Math.round(d)} pts`
            )}
          />
        )}
      </div>

      <p className="text-xs text-ink/40 text-center">
        Across {n} take{n === 1 ? '' : 's'} · newest on the right
      </p>
    </div>
  );
}

// Plain-language headline, led by the overall-score change.
function Headline({ first, last, n }) {
  const up = last.score > first.score;
  const flat = last.score === first.score;
  return (
    <div className="card bg-gradient-to-br from-brand-50 to-sand border-brand-100">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-600">Your progress</p>
      <p className="mt-2 font-display text-2xl sm:text-3xl font-semibold text-ink leading-tight">
        {up
          ? `Up ${(last.score - first.score).toFixed(1)} points since your first take`
          : flat
            ? `Holding steady at ${last.score}/10`
            : `Down ${(first.score - last.score).toFixed(1)} points — keep the reps going`}
      </p>
      <p className="mt-2 text-sm text-ink/55">
        Overall score went {first.score}/10 → {last.score}/10 across {n} takes.
        {first.fillerPct != null && last.fillerPct != null && last.fillerPct < first.fillerPct && (
          <> Filler rate dropped from {first.fillerPct}% to {last.fillerPct}%.</>
        )}
      </p>
    </div>
  );
}

// One metric's trend: current value, a direction badge, a mini sparkline.
function TrendCard({ label, series, domain, fmt, delta }) {
  const data = series.map((v, i) => ({ i, v: v ?? null }));
  const current = series.at(-1);
  return (
    <div className="card py-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-ink/80">{label}</h4>
        {delta && (
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              delta.good ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {delta.text}
          </span>
        )}
      </div>
      <p className="mt-1 font-display text-2xl font-semibold text-ink tabular-nums leading-none">
        {current == null ? '—' : fmt(current)}
      </p>
      <div className="mt-2 h-16">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, bottom: 6, left: 2, right: 2 }}>
            <YAxis hide domain={domain} />
            <Line
              type="monotone"
              dataKey="v"
              stroke={BRAND}
              strokeWidth={2}
              dot={{ r: 2, fill: BRAND }}
              isAnimationActive={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// --- Direction helpers: each returns { text, good } or null ---
function deltaHigherBetter(a, b, fmt) {
  if (a == null || b == null) return null;
  const d = b - a;
  return { text: fmt(d), good: d >= 0 };
}
function deltaLowerBetter(a, b) {
  if (a == null || b == null || a === 0) return b != null ? { text: `${b}%`, good: b <= 3 } : null;
  const pct = Math.round(((a - b) / a) * 100);
  return { text: pct >= 0 ? `${pct}% fewer` : `${-pct}% more`, good: pct >= 0 };
}
function deltaPace(a, b) {
  if (a == null || b == null) return null;
  const dist = (w) => Math.max(0, 120 - w, w - 160); // distance from the 120–160 band
  const closer = dist(b) < dist(a);
  const inBand = dist(b) === 0;
  return { text: inBand ? 'in range' : closer ? 'closer to ideal' : 'drifting', good: inBand || closer };
}
