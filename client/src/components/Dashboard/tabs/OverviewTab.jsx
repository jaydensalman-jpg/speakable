import ScoreRing from '../../ui/ScoreRing.jsx';

// Overview = the transparent score page. New reports carry feedback.breakdown
// (per metric: raw value, target, points contributed, one plain sentence) and
// the overall is literally the average of those metric scores, so this tab just
// renders the math. Metrics without real data aren't in the breakdown at all.
// Eye contact gets its own featured section (pulled out of the list) with a
// gauge + time bar. Sessions saved by older builds have no breakdown and fall
// back to the legacy category view.
export default function OverviewTab({ results }) {
  const { feedback, avgWpm, fillerWordCounts, pauses, duration, words, eyeContact } = results;
  const totalFillers = Object.values(fillerWordCounts).reduce((a, b) => a + b, 0);
  const wordCount = words.length;
  const breakdown = feedback.breakdown || null;
  const eyeMetric = breakdown?.find((m) => m.id === 'eyeContact') || null;
  const listMetrics = breakdown?.filter((m) => m.id !== 'eyeContact') || null;

  const stats = [
    { label: 'Words', value: wordCount.toLocaleString() },
    { label: 'Avg pace', value: `${avgWpm} WPM` },
    { label: 'Fillers', value: totalFillers },
    { label: 'Pauses', value: pauses.length },
    { label: 'Duration', value: formatDuration(duration) },
  ];

  const getBarColor = (score) =>
    score >= 8 ? '#10b981' : score >= 6 ? '#e0714f' : score >= 4 ? '#f59e0b' : '#ef4444';

  return (
    <div className="space-y-5">
      {/* Overall score + one line on how it works */}
      <div className="card flex flex-col sm:flex-row gap-8 items-center">
        <div className="shrink-0">
          <ScoreRing score={feedback.overallScore} size={140} label="Overall Score" />
        </div>
        <div className="flex-1 w-full">
          {breakdown ? (
            <>
              <p className="text-sm text-ink/65 leading-relaxed">
                Your score is simply the average of the {breakdown.length} areas measured in this
                take. Each one is scored out of 10 and counts equally.
              </p>
              {feedback.meta?.cap < 10 && (
                <p className="mt-2 text-xs text-ink/45 leading-relaxed">
                  Short take: scores are capped at {feedback.meta.cap} until you record about 45
                  seconds. More speech, more evidence, higher ceiling.
                </p>
              )}
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
                      style={{ width: `${score * 10}%`, backgroundColor: getBarColor(score) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Eye contact, featured — it deserves its own stage */}
      {eyeMetric && eyeContact && <EyeContactSection metric={eyeMetric} data={eyeContact} />}

      {/* Remaining metrics, kept light: one bar, one fact line, one sentence */}
      {listMetrics && listMetrics.length > 0 && (
        <div className="space-y-3">
          {listMetrics.map((m) => (
            <div key={m.id} className="card py-5">
              <div className="flex items-center gap-3">
                <h4 className="font-semibold text-ink/80">{m.label}</h4>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    m.inRange ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {m.inRange ? 'on target' : 'needs work'}
                </span>
                <span className="ml-auto text-sm font-bold text-ink tabular-nums">{m.score}/10</span>
              </div>
              <div className="mt-2 h-1.5 bg-sand rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${m.score * 10}%`, backgroundColor: getBarColor(m.score) }}
                />
              </div>
              <p className="mt-2 text-xs text-ink/45 tabular-nums">
                You: <span className="font-semibold text-ink/70">{m.valueDisplay}</span>
                <span className="mx-1.5">·</span>
                Target: <span className="font-semibold text-ink/70">{m.targetDisplay}</span>
                <span className="mx-1.5">·</span>
                Adds <span className="font-semibold text-ink/70">{m.points}</span> of {m.maxPoints} pts
              </p>
              <p className="mt-1.5 text-sm text-ink/60 leading-relaxed">{m.sentence}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <span className="text-xl font-bold text-ink tabular-nums">{s.value}</span>
            <span className="text-xs text-ink/45 font-medium">{s.label}</span>
          </div>
        ))}
      </div>

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

      {/* Highlights */}
      {feedback.highlights?.length > 0 && (
        <div className="card border-emerald-200 bg-emerald-50">
          <h3 className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-3">
            Strengths
          </h3>
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

// Featured eye-contact section: a gauge for the share of the talk spent on the
// camera, a bar showing time on camera vs looking away, and the two key stats.
function EyeContactSection({ metric, data }) {
  const pct = data.contactPct;
  const r = 34;
  const c = 2 * Math.PI * r;

  return (
    <div className="card bg-gradient-to-br from-brand-50 to-sand border-brand-100">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <h3 className="text-xs font-semibold text-brand-700 uppercase tracking-wider">Eye contact</h3>
        <span className="ml-auto text-sm font-bold text-ink tabular-nums">{metric.score}/10</span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Gauge: share of the talk spent facing the camera */}
        <div className="relative h-[88px] w-[88px] shrink-0">
          <svg width="88" height="88" className="-rotate-90">
            <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(43,38,34,0.08)" strokeWidth="8" />
            <circle
              cx="44" cy="44" r={r} fill="none" stroke="#e0714f" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c}
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-2xl font-semibold leading-none text-ink">{pct}%</span>
            <span className="text-[10px] text-ink/45 mt-0.5">on camera</span>
          </div>
        </div>

        <div className="flex-1 w-full min-w-0">
          {/* Where the time went */}
          <div className="flex h-3 w-full overflow-hidden rounded-full">
            <div className="bg-brand-500 transition-all duration-700" style={{ width: `${pct}%` }} />
            <div className="flex-1 bg-ink/10" />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-ink/50">
            <span>
              <span className="inline-block w-2 h-2 rounded-full bg-brand-500 mr-1 align-middle" />
              Looking at your audience ({formatDuration(data.contactSeconds)})
            </span>
            <span>Looking away</span>
          </div>

          <div className="mt-4 flex gap-3">
            <div className="flex-1 rounded-2xl bg-white/70 px-4 py-2.5">
              <p className="text-lg font-bold text-ink tabular-nums leading-tight">{Math.round(data.longestStreakSeconds)}s</p>
              <p className="text-[11px] text-ink/50">longest hold</p>
            </div>
            <div className="flex-1 rounded-2xl bg-white/70 px-4 py-2.5">
              <p className="text-lg font-bold text-ink tabular-nums leading-tight">{metric.inRange ? 'Yes' : 'Not yet'}</p>
              <p className="text-[11px] text-ink/50">target: {metric.targetDisplay}</p>
            </div>
          </div>

          <p className="mt-3 text-sm text-ink/65 leading-relaxed">{metric.sentence}</p>
        </div>
      </div>
    </div>
  );
}

function formatDuration(s) {
  if (!s) return '—';
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}
