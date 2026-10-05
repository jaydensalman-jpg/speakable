// Filler Words — rebuilt Oct 2026 from the Figma Make redesign: cardless, the
// total carried by a large coral numeral, the rate shown against the 5% target,
// then a plain breakdown list. Every figure is computed from this take.

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
  const perMinute = duration > 0 ? (totalFillers / (duration / 60)).toFixed(1) : null;
  const isGood = parseFloat(percentage) < TARGET_PCT;

  const fillWidth = Math.min(parseFloat(percentage) / SCALE_MAX_PCT, 1) * 100;
  const targetLeft = (TARGET_PCT / SCALE_MAX_PCT) * 100;

  const sorted = Object.entries(fillerWordCounts)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);

  return (
    <div className="animate-rise">
      {/* The total, and where it sits against the target */}
      <section className="panel mb-8">
        <p className="eyebrow">Filler words</p>

        <p className="stat-xl mt-4 text-[48px] text-brand-600 sm:text-[64px]">{totalFillers}</p>
        <p className="caption mt-2">
          total used{perMinute ? ` · ${perMinute} per minute` : ''}
        </p>

        <p className="statement mt-7">
          {totalFillers === 0
            ? 'None detected in this take.'
            : isGood
              ? 'You are on target.'
              : 'That is above the 5% target.'}
        </p>

        {totalWords > 0 && (
          <>
            <div className="relative mt-5 h-2.5 rounded-full bg-sand">
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
            <div className="mt-2.5 flex items-baseline justify-between text-[13px] tabular-nums">
              <span className={isGood ? 'font-semibold text-emerald-600' : 'font-semibold text-amber-600'}>
                Your rate {percentage}%
              </span>
              <span className="text-ink/40">Goal under {TARGET_PCT}%</span>
            </div>
          </>
        )}
      </section>

      {/* Which ones, and how often */}
      {sorted.length > 0 && (
        <section className="sheet">
          <p className="eyebrow">Breakdown</p>
          <ul className="mt-4">
            {sorted.map(([word, count]) => (
              <li
                key={word}
                className="flex items-baseline justify-between gap-4 border-b border-sand py-3 last:border-b-0"
              >
                <span className="font-mono text-[15px] text-ink/75">&ldquo;{word}&rdquo;</span>
                <span className="stat-xl text-[20px] text-ink/70">{count}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="sheet">
        <p className="statement">Pause instead of filling the silence.</p>
        <p className="caption mt-2 max-w-prose">
          Filler words above {TARGET_PCT}% (roughly 1 per 20 words) read as uncertainty and pull
          attention off your point. A deliberate pause does the same job and sounds considered.
        </p>
      </section>
    </div>
  );
}
