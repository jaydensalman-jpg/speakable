export default function FillerWordsTab({ results }) {
  const { fillerWordCounts, words, displayWords, duration } = results;
  const totalFillers = Object.values(fillerWordCounts).reduce((a, b) => a + b, 0);
  // Count against every spoken word, including the "um"/"uh" Whisper dropped, so
  // the percentage lines up with the total and the transcript highlights.
  const totalWords = (displayWords || words).length;
  const percentage = totalWords > 0 ? ((totalFillers / totalWords) * 100).toFixed(1) : '0.0';
  const perMinute = duration > 0 ? (totalFillers / (duration / 60)).toFixed(1) : '0.0';
  const isGood = parseFloat(percentage) < 5;

  const sorted = Object.entries(fillerWordCounts)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);
  const maxCount = sorted[0]?.[1] || 1;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat-card">
          <span className="text-2xl font-bold text-ink tabular-nums">{totalFillers}</span>
          <span className="text-xs text-ink/45 font-medium">Total fillers</span>
        </div>
        <div className="stat-card">
          <span className={`text-2xl font-bold tabular-nums ${isGood ? 'text-emerald-600' : 'text-amber-600'}`}>
            {percentage}%
          </span>
          <span className="text-xs text-ink/45 font-medium">Of total words</span>
        </div>
        <div className="stat-card">
          <span className="text-2xl font-bold text-ink tabular-nums">{perMinute}</span>
          <span className="text-xs text-ink/45 font-medium">Per minute</span>
        </div>
        <div className="stat-card">
          <span className="text-xl font-bold text-ink truncate font-mono">
            {sorted[0]?.[0] ? `"${sorted[0][0]}"` : '—'}
          </span>
          <span className="text-xs text-ink/45 font-medium">Most used</span>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="card text-center py-12">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-semibold text-ink/80">No fillers detected</p>
          <p className="text-sm text-ink/45 mt-1">Nothing to flag.</p>
        </div>
      ) : (
        <div className="card">
          <h3 className="font-semibold text-ink/80 mb-4">Breakdown</h3>
          <div className="space-y-3">
            {sorted.map(([word, count]) => (
              <div key={word} className="flex items-center gap-3">
                <span className="w-16 text-sm font-medium text-ink/65 text-right shrink-0 font-mono">
                  "{word}"
                </span>
                <div className="flex-1 h-5 bg-sand rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="w-5 text-sm font-bold text-ink/70 shrink-0 tabular-nums text-right">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card bg-cream border-sand">
        <p className="text-sm font-semibold text-ink/80 mb-1">Why it matters</p>
        <p className="text-sm text-ink/55 leading-relaxed">
          Filler words above 5% (roughly 1 per 20 words) signal uncertainty and distract your
          audience. A deliberate pause sounds far more confident than "um" or "like."
        </p>
      </div>
    </div>
  );
}
