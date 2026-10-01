// Bar runs 0 to 10% of words, double the 5% target, so a normal reading lands
// around mid-bar and stays legible. Scaled against 100% every real result would
// be an unreadable sliver.
const SCALE_MAX_PCT = 10;
const TARGET_PCT = 5;

export default function FillerWordsTab({ results }) {
  const { fillerWordCounts, words, displayWords, duration } = results;
  const totalFillers = Object.values(fillerWordCounts).reduce((a, b) => a + b, 0);
  // Count against every spoken word, including the "um"/"uh" Whisper dropped, so
  // the percentage lines up with the total and the transcript highlights.
  const totalWords = (displayWords || words).length;
  const percentage = totalWords > 0 ? ((totalFillers / totalWords) * 100).toFixed(1) : '0.0';
  const isGood = parseFloat(percentage) < TARGET_PCT;

  const fillWidth = Math.min(parseFloat(percentage) / SCALE_MAX_PCT, 1) * 100;
  const targetLeft = (TARGET_PCT / SCALE_MAX_PCT) * 100;

  const sorted = Object.entries(fillerWordCounts)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);
  const maxCount = sorted[0]?.[1] || 1;

  return (
    <div className="space-y-5">
      {/* Headline count, with the one bar that gives the number meaning: where
          this take sits against the 5% target. */}
      <div className="card">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">Filler words</p>

        <div className="mt-2 flex items-baseline gap-3">
          <span className="font-display text-5xl font-semibold tracking-tight text-ink tabular-nums leading-none">
            {totalFillers}
          </span>
          <span className="text-sm text-ink/45 tabular-nums">of {totalWords.toLocaleString()} words</span>
        </div>

        <div className="relative mt-6 h-2.5 rounded-full bg-sand">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-brand-500 transition-all duration-700"
            style={{ width: `${fillWidth}%` }}
          />
          {/* Target marker sits above the fill so it stays visible either side of it. */}
          <div
            className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-ink/25"
            style={{ left: `${targetLeft}%` }}
            aria-hidden
          />
        </div>

        <div className="mt-2.5 flex items-baseline justify-between text-xs tabular-nums">
          <span className={isGood ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
            {percentage}% of what you said
          </span>
          <span className="text-ink/40">target under {TARGET_PCT}%</span>
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
                    className="h-full bg-brand-500 rounded-full transition-all duration-500"
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
