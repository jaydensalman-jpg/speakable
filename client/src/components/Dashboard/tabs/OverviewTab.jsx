import ScoreRing from '../../ui/ScoreRing.jsx';

// Overview = the transparent score page, laid out as a bento grid (adapted from
// Kokonut UI "features-8": 6-col grid, three visual cards up top, wider cards
// below — rebuilt on our .card/cream/coral tokens instead of shadcn's). Every
// number is real: the overall is literally the average of the metric scores in
// feedback.breakdown, each card is anchored by its own measurement (gauge,
// sparkline, chips), and metrics without data simply aren't rendered.
// Sessions saved by older builds have no breakdown → legacy category view.
export default function OverviewTab({ results }) {
  const { feedback, avgWpm, fillerWordCounts, wpmData, pauses, duration, words, eyeContact } = results;
  const totalFillers = Object.values(fillerWordCounts).reduce((a, b) => a + b, 0);
  const wordCount = words.length;
  const breakdown = feedback.breakdown || null;

  const stats = [
    { label: 'Words', value: wordCount.toLocaleString() },
    { label: 'Avg pace', value: `${avgWpm} WPM` },
    { label: 'Fillers', value: totalFillers },
    { label: 'Pauses', value: pauses.length },
    { label: 'Duration', value: formatDuration(duration) },
  ];

  // Display order puts the visual cards first (eye gauge, pace chart, fillers).
  const ORDER = ['eyeContact', 'pace', 'fillers', 'flow', 'vocabulary', 'articulation'];
  const cards = breakdown
    ? ORDER.map((id) => breakdown.find((m) => m.id === id)).filter(Boolean)
    : [];

  // Bento spans: first three cards sit three-across on desktop, the rest two-
  // across; a leftover card stretches the full row instead of dangling.
  const spanFor = (i, n) => {
    if (n <= 2) return 'col-span-full sm:col-span-3';
    if (i < 3) return 'col-span-full sm:col-span-3 lg:col-span-2';
    const rest = n - 3;
    const isLastOdd = rest % 2 === 1 && i === n - 1;
    return `col-span-full sm:col-span-3 ${isLastOdd ? 'lg:col-span-6' : 'lg:col-span-3'}`;
  };

  return (
    <div className="space-y-5">
      {/* Overall score + verdict */}
      <div className="card flex flex-col sm:flex-row gap-8 items-center">
        <div className="shrink-0">
          <ScoreRing score={feedback.overallScore} size={140} label="Overall Score" />
        </div>
        <div className="flex-1 w-full">
          {breakdown ? (
            <>
              {feedback.assessment ? (
                <Verdict assessment={feedback.assessment} />
              ) : (
                <p className="text-[15px] text-ink/80 leading-relaxed font-medium">{feedback.summary}</p>
              )}
              <p className="mt-3 text-xs text-ink/40 leading-relaxed tabular-nums">
                {wordCount} words · {formatDuration(duration)}
                {feedback.meta?.cap < 10 && ` · capped at ${feedback.meta.cap} for short takes`}
              </p>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-4 w-full">
              {Object.entries(feedback.categoryScores).map(([cat, score]) => (
                <div key={cat} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-ink/65 capitalize">{cat}</span>
                    <span className="text-sm font-bold text-ink">{score}/10</span>
                  </div>
                  <div className="h-1.5 bg-sand rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${score * 10}%`, backgroundColor: barColor(score) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Metric bento grid */}
      {cards.length > 0 && (
        <div className="grid grid-cols-6 gap-3">
          {cards.map((m, i) => (
            <MetricCard key={m.id} metric={m} className={spanFor(i, cards.length)} tinted={m.id === 'eyeContact'}>
              {m.id === 'eyeContact' && eyeContact && <EyeGauge data={eyeContact} />}
              {m.id === 'pace' && <PaceChart avgWpm={avgWpm} wpmData={wpmData} />}
              {m.id === 'fillers' && (
                <FillerChips counts={fillerWordCounts} total={totalFillers} duration={duration} />
              )}
              {m.id === 'flow' && (
                <BigStat value={pauses.length} unit={pauses.length === 1 ? 'long pause' : 'long pauses'} />
              )}
              {m.id === 'vocabulary' && <BigStat value={m.valueDisplay.split('%')[0] + '%'} unit="unique words" />}
              {m.id === 'articulation' && <BigStat value={m.valueDisplay.split('%')[0] + '%'} unit="recognized clearly" />}
            </MetricCard>
          ))}
        </div>
      )}

      {/* Quick stats — legacy reports only; the bento cards carry these now */}
      {!breakdown && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="stat-card">
              <span className="text-xl font-semibold tracking-tight text-ink tabular-nums">{s.value}</span>
              <span className="text-xs text-ink/45 font-medium">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Eye contact card for sessions saved before the breakdown existed */}
      {!breakdown && eyeContact && (
        <div className="card">
          <h3 className="text-xs font-semibold text-ink/45 uppercase tracking-wider mb-3">Eye contact</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="stat-card">
              <span className="text-xl font-bold text-ink tabular-nums">{eyeContact.contactPct}%</span>
              <span className="text-xs text-ink/45 font-medium">Of your talk</span>
            </div>
            <div className="stat-card">
              <span className="text-xl font-bold text-ink tabular-nums">{formatDuration(eyeContact.contactSeconds)}</span>
              <span className="text-xs text-ink/45 font-medium">Total time</span>
            </div>
            <div className="stat-card">
              <span className="text-xl font-bold text-ink tabular-nums">{formatDuration(eyeContact.longestStreakSeconds)}</span>
              <span className="text-xs text-ink/45 font-medium">Longest hold</span>
            </div>
          </div>
        </div>
      )}

      {/* Highlights — legacy only; the verdict and green pills cover this now,
          and the Coaching tab keeps the full "working already" list */}
      {!breakdown && feedback.highlights?.length > 0 && (
        <div className="card border-emerald-200 bg-emerald-50">
          <h3 className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-3">Strengths</h3>
          <ul className="space-y-2">
            {feedback.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-emerald-800">
                <svg className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Verdict: two scannable lines instead of a run-on sentence — what's strong,
// and the 1–2 things to focus on. If nothing needs work, one clean line.
function Verdict({ assessment }) {
  const { strong, focus } = assessment;
  if (!focus.length) {
    return (
      <p className="text-[15px] text-ink/80 leading-relaxed font-medium">
        Everything measured landed on target. Nice work. Now do it twice in a row.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2.5">
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-brand-600">Focus on</span>
        <span className="text-[15px] font-semibold text-ink leading-snug">{focus.join(', ')}</span>
      </div>
      {strong.length > 0 && (
        <div className="flex items-baseline gap-2.5">
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-emerald-600">Strong</span>
          <span className="text-sm text-ink/55 leading-snug">{strong.join(', ')}</span>
        </div>
      )}
    </div>
  );
}

// Bento card, kept to three elements: label, one tinted score pill (state and
// score in a single glance), the visual. Words only where action is needed.
function MetricCard({ metric, className, tinted, children }) {
  return (
    <div
      className={`card flex flex-col py-4 ${className} ${
        tinted ? 'bg-gradient-to-br from-brand-50 to-sand border-brand-100' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-ink/80">{metric.label}</h4>
        <span
          className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-full ${
            metric.inRange ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {metric.score}/10
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-center py-3">{children}</div>

      {/* One plain verdict per card — good or bad, in a couple of words. The
          full "why it matters" explanation lives in the Coaching tab. */}
      {metric.plain && (
        <p
          className={`text-center text-xs font-semibold ${
            metric.inRange ? 'text-emerald-600' : 'text-amber-600'
          }`}
        >
          {metric.plain}
        </p>
      )}
    </div>
  );
}

// Ring gauge showing time spent on camera. Compact halo treatment.
function EyeGauge({ data }) {
  const pct = data.contactPct;
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div className="text-center">
      <div className="relative mx-auto flex aspect-square w-[84px] items-center justify-center rounded-full before:absolute before:-inset-2 before:rounded-full before:border before:border-brand-200/50">
        <svg width="84" height="84" className="-rotate-90 absolute inset-0">
          <circle cx="42" cy="42" r={r} fill="none" stroke="rgba(43,38,34,0.08)" strokeWidth="7" />
          <circle
            cx="42" cy="42" r={r} fill="none" stroke="#e0714f" strokeWidth="7" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c}
            className="transition-all duration-700"
          />
        </svg>
        <span className="relative text-xl font-semibold tracking-tight tabular-nums leading-none text-ink">{pct}%</span>
      </div>
      <p className="mt-2.5 text-[11px] text-ink/50 tabular-nums">
        on camera · longest hold {Math.round(data.longestStreakSeconds)}s
      </p>
    </div>
  );
}

// Big WPM + a sparkline over the take, with the 120–160 comfort band shaded.
function PaceChart({ avgWpm, wpmData }) {
  const pts = (wpmData || []).map((d) => d.wpm).filter((n) => n > 0);
  const w = 220;
  const h = 40;
  const lo = Math.min(80, ...pts);
  const hi = Math.max(180, ...pts);
  const x = (i) => (pts.length > 1 ? (i / (pts.length - 1)) * w : w / 2);
  const y = (v) => h - ((v - lo) / (hi - lo || 1)) * h;
  const path = pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <div className="text-center">
      <p className="text-[1.75rem] font-semibold tracking-tight text-ink tabular-nums leading-none">
        {avgWpm}
        <span className="ml-1.5 text-xs font-sans font-medium text-ink/45">WPM</span>
      </p>
      {pts.length > 1 && (
        <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 w-full h-9" preserveAspectRatio="none" aria-hidden>
          <rect x="0" y={y(160)} width={w} height={Math.max(y(120) - y(160), 0)} fill="#e0714f" opacity="0.09" />
          <path d={path} fill="none" stroke="#e0714f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

// Big total with a clear label (fixes "2912.6/min" run-together), then the top
// offenders as chips.
function FillerChips({ counts, total, duration }) {
  const top = Object.entries(counts).filter(([, n]) => n > 0).sort(([, a], [, b]) => b - a).slice(0, 3);
  const perMin = duration > 0 ? (total / (duration / 60)).toFixed(1) : '0.0';
  return (
    <div className="text-center">
      <p className="text-[1.75rem] font-semibold tracking-tight text-ink tabular-nums leading-none">{total}</p>
      <p className="mt-1 text-[11px] text-ink/45 tabular-nums">total · {perMin} per min</p>
      {top.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {top.map(([word, n]) => (
            <span key={word} className="rounded-full border border-sand bg-cream px-2.5 py-0.5 text-xs text-ink/70">
              "{word}" ×{n}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function BigStat({ value, unit }) {
  return (
    <div className="text-center">
      <p className="text-[1.75rem] font-semibold tracking-tight text-ink tabular-nums leading-none">{value}</p>
      <p className="mt-1.5 text-[11px] text-ink/45">{unit}</p>
    </div>
  );
}

function barColor(score) {
  return score >= 8 ? '#10b981' : score >= 6 ? '#e0714f' : score >= 4 ? '#f59e0b' : '#ef4444';
}

function formatDuration(s) {
  if (!s) return '—';
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}
