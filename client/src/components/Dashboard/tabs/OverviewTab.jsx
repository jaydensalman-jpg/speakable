import ScoreRing from '../../ui/ScoreRing.jsx';

// Overview = the transparent score page. New reports carry feedback.breakdown
// (per-metric: raw value, target, points contributed, one plain sentence) and
// the overall is literally the average of those metric scores — so this tab
// just renders the math, it never invents numbers. Metrics with no real data
// aren't in the breakdown at all (hidden, not faked). Sessions saved by older
// builds have no breakdown and fall back to the legacy category view.
export default function OverviewTab({ results }) {
  const { feedback, avgWpm, fillerWordCounts, pauses, duration, words, eyeContact } = results;
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

  const getBarColor = (score) =>
    score >= 8 ? '#10b981' : score >= 6 ? '#e0714f' : score >= 4 ? '#f59e0b' : '#ef4444';

  return (
    <div className="space-y-5">
      {/* Overall score + how it's computed */}
      <div className="card flex flex-col sm:flex-row gap-8 items-center">
        <div className="shrink-0">
          <ScoreRing score={feedback.overallScore} size={140} label="Overall Score" />
        </div>
        <div className="flex-1 w-full">
          {breakdown ? (
            <>
              <p className="text-sm text-ink/65 leading-relaxed">
                This score is the average of the {breakdown.length} area
                {breakdown.length === 1 ? '' : 's'} measured in this take — each scored 1–10 below,
                each contributing equally. Nothing else feeds it.
              </p>
              {feedback.meta?.cap < 10 && (
                <p className="mt-2 text-xs text-ink/45 leading-relaxed">
                  Short sample: scores are capped at {feedback.meta.cap}/10 until a take has ~80
                  words or 45 seconds — there isn't enough evidence to grade higher.
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

      {/* Per-metric breakdown — value, target, contribution, plain-language why */}
      {breakdown && breakdown.length > 0 && (
        <div className="space-y-3">
          {breakdown.map((m) => (
            <div key={m.id} className="card">
              <div className="flex items-center gap-3">
                <h4 className="font-semibold text-ink/80">{m.label}</h4>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    m.inRange ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {m.inRange ? 'on target' : 'off target'}
                </span>
                <span className="ml-auto text-sm font-bold text-ink tabular-nums">{m.score}/10</span>
              </div>
              <div className="mt-2 h-1.5 bg-sand rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${m.score * 10}%`, backgroundColor: getBarColor(m.score) }}
                />
              </div>
              <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink/55 tabular-nums">
                <span>
                  Measured: <span className="font-semibold text-ink/75">{m.valueDisplay}</span>
                </span>
                <span>
                  Target: <span className="font-semibold text-ink/75">{m.targetDisplay}</span>
                </span>
                <span>
                  Contributes <span className="font-semibold text-ink/75">{m.points}</span> of{' '}
                  {m.maxPoints} possible points
                </span>
              </div>
              <p className="mt-2 text-sm text-ink/65 leading-relaxed">{m.sentence}</p>
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

      {/* Eye contact card — legacy sessions only (new reports carry it in the breakdown) */}
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
                <svg
                  className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                >
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

function formatDuration(s) {
  if (!s) return '—';
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}
