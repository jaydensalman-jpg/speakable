// Filler Words — rebuilt Oct 2026 from the Figma Make redesign: cardless, the
// total carried by a large coral numeral, the rate shown against the 5% target,
// then a plain breakdown list. Every figure is computed from this take.

import RankedBars from '../../ui/ranked-bars.jsx';

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
      {/* .filler-lead — total on the left behind a divider, goal + scale on the
          right. Two columns on desktop, stacked with a rule between on phones. */}
      <section className="panel mb-8 grid items-center gap-6 md:grid-cols-[0.7fr_1.3fr] md:gap-12">
        <div className="border-b border-sand pb-6 md:border-b-0 md:border-r md:pb-0 md:pr-8">
          <p className="eyebrow">Filler words</p>
          <div className="mt-2 flex items-end gap-3">
            <p className="stat-xl text-[3rem] text-brand-500 md:text-[4rem]">{totalFillers}</p>
            <p className="caption pb-2">total used{perMinute ? ` · ${perMinute}/min` : ''}</p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="statement">
              {totalFillers === 0
                ? 'None detected in this take.'
                : isGood
                  ? 'You are on target.'
                  : 'That is above the target.'}
            </p>
            <span className={`shrink-0 ${isGood ? 'pill-good' : 'pill-warn'}`}>
              {isGood ? `Under ${TARGET_PCT}%` : `Over ${TARGET_PCT}%`}
            </span>
          </div>

          {totalWords > 0 && (
            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between text-[0.8125rem] text-muted tabular-nums">
                <span>Your rate <strong className="font-semibold text-brand-500">{percentage}%</strong></span>
                <span>Goal under {TARGET_PCT}%</span>
              </div>
              <div className="relative h-2.5 overflow-hidden rounded-full bg-sand">
                <span
                  className="block h-full rounded-full bg-brand-500 transition-all duration-700"
                  style={{ width: `${fillWidth}%` }}
                />
              </div>
              {/* Target marker sits outside the clipped track so it stays visible. */}
              <div className="relative">
                <span
                  className="absolute -top-[1.1rem] h-4 w-px bg-ink"
                  style={{ left: `${targetLeft}%` }}
                  aria-hidden
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Which ones, and how often */}
      {sorted.length > 0 && (
        <section className="sheet">
          <p className="eyebrow">Breakdown</p>
          <RankedBars rows={sorted} divided />
        </section>
      )}

      <section className="sheet grid gap-4 md:grid-cols-[14rem_1fr] md:gap-8">
        <p className="statement">Pause instead of filling the silence.</p>
        <p className="body-copy">
          Filler words above {TARGET_PCT}% (roughly 1 per 20 words) read as uncertainty and pull
          attention off your point. A deliberate pause does the same job and sounds considered.
        </p>
      </section>
    </div>
  );
}
