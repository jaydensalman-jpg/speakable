// Pacing, rebuilt for clarity. The old per-10s line chart was noisy and hard to
// read. This leads with a single speedometer: a horizontal scale from 80–200 WPM
// with the comfortable 120–160 band shaded green and a marker at your average —
// you see instantly whether you're slow, ideal, or fast. Below it: a plain
// verdict, a one-line steadiness read, and where your long pauses landed.

const SCALE_MIN = 80;
const SCALE_MAX = 200;
const IDEAL_LOW = 120;
const IDEAL_HIGH = 160;

const pct = (wpm) => Math.max(0, Math.min(100, ((wpm - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100));

export default function PacingTab({ results }) {
  const { avgWpm, wpmData, pauses } = results;

  const rating =
    avgWpm < 100 ? { label: 'Too slow', tone: 'red' }
    : avgWpm < 120 ? { label: 'A little slow', tone: 'amber' }
    : avgWpm <= 160 ? { label: 'Right on pace', tone: 'emerald' }
    : avgWpm <= 180 ? { label: 'A little fast', tone: 'amber' }
    : { label: 'Too fast', tone: 'red' };

  const toneText = { emerald: 'text-emerald-600', amber: 'text-amber-600', red: 'text-red-500' }[rating.tone];
  const toneBg = { emerald: 'bg-emerald-100 text-emerald-700', amber: 'bg-amber-100 text-amber-700', red: 'bg-red-100 text-red-600' }[rating.tone];

  const verdict =
    avgWpm < 120
      ? `You averaged ${avgWpm} words per minute, a bit under the range where a talk feels energetic. Picking up slightly will keep listeners leaning in.`
      : avgWpm > 160
        ? `You averaged ${avgWpm} words per minute, quicker than most listeners comfortably absorb. Slowing down gives your key points room to land.`
        : `You averaged ${avgWpm} words per minute, right in the range listeners follow most comfortably. Keep it here.`;

  // Steadiness read from the pace-over-time samples (no chart needed).
  const paceVals = (wpmData || []).map((d) => d.wpm).filter((n) => n > 0);
  let steadiness = null;
  if (paceVals.length >= 3) {
    const mean = paceVals.reduce((a, b) => a + b, 0) / paceVals.length;
    const sd = Math.sqrt(paceVals.reduce((a, b) => a + (b - mean) ** 2, 0) / paceVals.length);
    const firstHalf = paceVals.slice(0, Math.floor(paceVals.length / 2));
    const secondHalf = paceVals.slice(Math.ceil(paceVals.length / 2));
    const fAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const sAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const drift = sAvg - fAvg;
    steadiness =
      sd < 18
        ? { text: 'Your pace held steady the whole way through, easy to follow.', good: true }
        : drift > 15
          ? { text: 'You sped up as you went. Watch for rushing toward the end.', good: false }
          : drift < -15
            ? { text: 'You slowed down as you went. Keep your energy up through the finish.', good: false }
            : { text: 'Your pace bounced around a fair bit. Aim for a more even rhythm.', good: false };
  }

  return (
    <div className="space-y-5">
      {/* Speedometer */}
      <div className="card">
        <div className="flex items-baseline justify-between mb-5">
          <div className="flex items-baseline gap-2">
            <span className={`font-display text-4xl font-semibold tabular-nums ${toneText}`}>{avgWpm}</span>
            <span className="text-sm font-medium text-ink/45">words / min</span>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${toneBg}`}>{rating.label}</span>
        </div>

        {/* Scale: full track, shaded ideal band, marker at your average */}
        <div className="relative h-3 rounded-full bg-sand overflow-hidden">
          <div
            className="absolute inset-y-0 bg-emerald-200/70"
            style={{ left: `${pct(IDEAL_LOW)}%`, right: `${100 - pct(IDEAL_HIGH)}%` }}
          />
        </div>
        <div className="relative h-0">
          <div
            className="absolute -top-[18px] flex flex-col items-center -translate-x-1/2"
            style={{ left: `${pct(avgWpm)}%` }}
          >
            <span className={`w-3 h-3 rounded-full ring-2 ring-white shadow-soft ${
              rating.tone === 'emerald' ? 'bg-emerald-500' : rating.tone === 'amber' ? 'bg-amber-500' : 'bg-red-500'
            }`} />
          </div>
        </div>

        {/* Scale labels */}
        <div className="mt-2 flex justify-between text-[11px] text-ink/40">
          <span>80</span>
          <span className="text-emerald-600 font-medium">120–160 ideal</span>
          <span>200</span>
        </div>

        <p className="mt-4 text-sm text-ink/65 leading-relaxed">{verdict}</p>
      </div>

      {/* Steadiness */}
      {steadiness && (
        <div className="card flex items-start gap-3">
          <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${steadiness.good ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <div>
            <h3 className="text-sm font-semibold text-ink/80">Consistency</h3>
            <p className="text-sm text-ink/60 leading-relaxed mt-0.5">{steadiness.text}</p>
          </div>
        </div>
      )}

      {/* Long pauses — where the thread went quiet */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-ink/80">Long pauses</h3>
          <span className="text-xs text-ink/45">{pauses.length} over 2 seconds</span>
        </div>
        {pauses.length === 0 ? (
          <p className="text-sm text-ink/50">No stalls longer than 2 seconds. Your flow never dropped.</p>
        ) : (
          <div className="space-y-2">
            {pauses.map((p, i) => (
              <div key={i} className="flex items-center gap-3 text-sm p-3 rounded-xl bg-cream">
                <span className="font-mono text-xs text-ink/45 shrink-0 tabular-nums w-10">{formatTime(p.at)}</span>
                <span className="font-semibold text-ink/70 shrink-0">{p.duration}s</span>
                <span className="text-ink/45 text-xs truncate">…"{p.before}" → "{p.after}"…</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}
