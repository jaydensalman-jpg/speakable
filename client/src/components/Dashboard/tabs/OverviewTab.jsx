import ScoreRing from '../../ui/ScoreRing.jsx';

export default function OverviewTab({ results }) {
  const { feedback, avgWpm, fillerWordCounts, pauses, duration, words } = results;
  const totalFillers = Object.values(fillerWordCounts).reduce((a, b) => a + b, 0);
  const wordCount = words.length;

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
      {/* Score + category scores */}
      <div className="card flex flex-col sm:flex-row gap-8 items-center">
        <div className="shrink-0">
          <ScoreRing score={feedback.overallScore} size={140} label="Overall Score" />
        </div>
        <div className="flex-1 grid grid-cols-2 gap-4 w-full">
          {Object.entries(feedback.categoryScores).map(([cat, score]) => (
            <div key={cat} className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-ink/65 capitalize">{cat}</span>
                <span className="text-sm font-bold text-ink">{score}/10</span>
              </div>
              <div className="h-1.5 bg-sand rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${score * 10}%`,
                    backgroundColor: getBarColor(score),
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <span className="text-xl font-bold text-ink tabular-nums">{s.value}</span>
            <span className="text-xs text-ink/45 font-medium">{s.label}</span>
          </div>
        ))}
      </div>

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
