import ScoreRing from '../../ui/ScoreRing.jsx';

// Overview — rebuilt Oct 2026 from the Figma Make redesign. The white cards are
// gone: the score and the four measured areas sit open on cream, separated by
// hairlines, with large Fraunces numerals carrying the hierarchy (.sheet /
// .eyebrow / .stat-xl in index.css).
//
// Every number and every caption below is read off the report. Nothing here is
// written as a literal, and where a session lacks the data for a line, the line
// is omitted rather than filled in — the same rule the scoring already follows.
// Sessions saved by older builds have no breakdown → legacy category view.

// The four scored areas, in display order. Sessions saved before Sept 2026
// still carry flow/articulation in their breakdown; leaving them out of this
// list is what keeps an old report's Overview consistent with the new score.
const ORDER = ['eyeContact', 'pace', 'fillers', 'vocabulary'];

// Plain explanation of where overallScore came from. Every figure is read
// straight off `breakdown`, so this can never assert anything the metrics
// don't already show. "Best" is the strongest ON-TARGET metric, not simply the
// highest score: a high score that is still off target did not hold anything up.
function scoreRationale(feedback, scoredIds) {
  const b = feedback.breakdown;
  if (!b || !b.length) return null;
  // A report saved before the scoring changed averaged metrics we no longer
  // show (flow, articulation). Naming only the visible four would misdescribe
  // where its number came from, so those reports get no sentence at all.
  if (b.some((m) => !scoredIds.includes(m.id))) return null;

  const asc = [...b].sort((a, z) => a.score - z.score);
  const weak = asc.filter((m) => !m.inRange).slice(0, 2);
  const best = [...b].filter((m) => m.inRange).sort((a, z) => z.score - a.score)[0];
  const ref = (m) => `${m.label.toLowerCase()} (${m.score}/10)`;

  const parts = [`Average of the ${b.length} areas measured.`];

  if (!weak.length) {
    parts.push('Everything measured landed on target.');
  } else {
    const dragged = weak.map(ref).join(' and ');
    const lead = dragged.charAt(0).toUpperCase() + dragged.slice(1);
    parts.push(best ? `${lead} pulled it down, ${ref(best)} held it up.` : `${lead} pulled it down.`);
  }

  const cap = feedback.meta?.cap;
  if (cap && cap < 10) parts.push(`Capped at ${cap} because the take was short.`);

  return parts.join(' ');
}

// One short headline, built from which areas actually missed target. Uses the
// metric LABELS rather than assessment.focus: those carry their numbers inline
// ("word variety (14% unique)"), which makes the sentence long and repeats
// figures the columns below already show. Never a qualitative judgement we
// didn't measure.
function headline(feedback) {
  const b = feedback.breakdown;
  if (!b || !b.length) return feedback.summary || null;
  const off = b.filter((m) => !m.inRange).map((m) => m.label.toLowerCase());
  if (!off.length) return 'Everything measured landed on target.';
  if (off.length === 1) return `Work on ${off[0]}.`;
  return `Work on ${off.slice(0, -1).join(', ')} and ${off[off.length - 1]}.`;
}

export default function OverviewTab({ results }) {
  const { feedback, avgWpm, fillerWordCounts, wpmData, duration, words, displayWords, eyeContact } = results;
  const totalFillers = Object.values(fillerWordCounts).reduce((a, b) => a + b, 0);
  const wordCount = (displayWords || words).length;
  const breakdown = feedback.breakdown || null;

  const stats = [
    { label: 'Words', value: wordCount.toLocaleString() },
    { label: 'Avg pace', value: `${avgWpm} WPM` },
    { label: 'Fillers', value: totalFillers },
    { label: 'Duration', value: formatDuration(duration) },
  ];

  const cards = breakdown
    ? ORDER.map((id) => breakdown.find((m) => m.id === id)).filter(Boolean)
    : [];

  // Value, unit and caption per metric, all read off this take's measurements.
  const present = (m) => {
    if (m.id === 'eyeContact' && eyeContact) {
      const hold = Math.round(eyeContact.longestStreakSeconds || 0);
      return {
        value: `${eyeContact.contactPct}%`,
        unit: null,
        caption: hold > 0 ? `on camera · longest hold ${hold}s` : 'on camera',
      };
    }
    if (m.id === 'pace') {
      return { value: avgWpm, unit: 'WPM', caption: paceCaption(wpmData, duration) };
    }
    if (m.id === 'fillers') {
      const perMin = duration > 0 ? (totalFillers / (duration / 60)).toFixed(1) : null;
      return {
        value: totalFillers,
        unit: null,
        caption: perMin ? `total · ${perMin} per min` : 'total',
      };
    }
    if (m.id === 'vocabulary') {
      return { value: m.valueDisplay.split('%')[0] + '%', unit: null, caption: 'unique words' };
    }
    // Any other metric still falls back to what the report itself says.
    return { value: m.valueDisplay, unit: null, caption: null };
  };

  const rationale = scoreRationale(feedback, ORDER);

  return (
    <div className="animate-rise">
      {/* Overall score + what to work on */}
      <section className="sheet">
        <p className="eyebrow">Overall score</p>

        {breakdown ? (
          /* Phone keeps the score beside the headline (auto 1fr, centred), as the
             design does — stacking it pushed everything below the fold. */
          <div className="mt-3 grid grid-cols-[auto_1fr] items-center gap-6 md:grid-cols-[13rem_1fr] md:items-end md:gap-12">
            <p className="stat-xl text-[5rem] leading-[0.85] text-brand-500 md:text-[6rem]">
              {feedback.overallScore}
              <span className="font-sans text-[1.0625rem] font-normal tracking-normal text-ink/55">/10</span>
            </p>
            <div className="min-w-0">
              <h2 className="text-balance font-display text-[1.8rem] leading-[1.08] tracking-[-0.025em] text-ink md:text-[2.5rem]">
                {headline(feedback)}
              </h2>
              {feedback.assessment?.strong?.length > 0 && (
                <p className="caption mt-3">
                  <span className="font-semibold text-good">On target</span>{' '}
                  {feedback.assessment.strong.join(', ').toLowerCase()}
                </p>
              )}
              {rationale && <p className="caption mt-1.5">{rationale}</p>}
            </div>
          </div>
        ) : (
          // Legacy reports (pre-breakdown) keep the ring + category bars.
          <div className="mt-4 flex flex-col items-center gap-8 sm:flex-row">
            <div className="shrink-0">
              <ScoreRing score={feedback.overallScore} size={140} label="Overall Score" />
            </div>
            <div className="grid w-full grid-cols-2 gap-4">
              {Object.entries(feedback.categoryScores || {}).map(([cat, score]) => (
                <div key={cat} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize text-ink/65">{cat}</span>
                    <span className="text-sm font-bold text-ink">{score}/10</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-sand">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${score * 10}%`, backgroundColor: barColor(score) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* The four measured areas: four across on desktop, pairs on a phone. */}
      {cards.length > 0 && (
        <section className="mb-8">
          <div className="metric-grid">
            {cards.map((m) => {
              const p = present(m);
              return (
                <div key={m.id} className="metric">
                  <div className="flex items-start justify-between gap-2">
                    <p className="eyebrow">{m.label}</p>
                    <span className={m.inRange ? 'pill-good' : 'pill-warn'}>{m.score}/10</span>
                  </div>

                  <p className="stat-xl mt-8 text-[3rem] md:mt-12 md:text-[3.5rem]">
                    {p.value}
                    {p.unit && (
                      <span className="ml-[0.4rem] font-sans text-[0.8125rem] font-normal tracking-normal text-muted">
                        {p.unit}
                      </span>
                    )}
                  </p>

                  {p.caption && <p className="caption mt-2">{p.caption}</p>}
                  {m.plain && (
                    <p className={`mt-auto pt-6 ${m.inRange ? 'verdict-good' : 'verdict-warn'}`}>{m.plain}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Quick stats — legacy reports only; the four columns carry these now */}
      {!breakdown && (
        <section className="sheet">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="stat-xl text-[1.75rem]">{s.value}</p>
                <p className="caption mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Eye contact detail for sessions saved before the breakdown existed */}
      {!breakdown && eyeContact && (
        <section className="sheet">
          <p className="eyebrow">Eye contact</p>
          <div className="mt-4 grid grid-cols-3 gap-6">
            <div>
              <p className="stat-xl text-[1.75rem]">{eyeContact.contactPct}%</p>
              <p className="caption mt-1">Of your talk</p>
            </div>
            <div>
              <p className="stat-xl text-[1.75rem]">{formatDuration(eyeContact.contactSeconds)}</p>
              <p className="caption mt-1">Total time</p>
            </div>
            <div>
              <p className="stat-xl text-[1.75rem]">{formatDuration(eyeContact.longestStreakSeconds)}</p>
              <p className="caption mt-1">Longest hold</p>
            </div>
          </div>
        </section>
      )}

      {/* Highlights — legacy only; the headline and green pills cover this now */}
      {!breakdown && feedback.highlights?.length > 0 && (
        <section className="sheet">
          <p className="eyebrow text-good">Strengths</p>
          <ul className="mt-3 space-y-2">
            {feedback.highlights.map((h, i) => (
              <li key={i} className="text-sm leading-relaxed text-ink/70">{h}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// Pace caption from the real per-chunk WPM series: call it steady only when the
// spread actually is, otherwise state the range. Falls back to the duration
// alone when a take is too short to have a series.
function paceCaption(wpmData, duration) {
  const pts = (wpmData || []).map((d) => d.wpm).filter((n) => n > 0);
  if (pts.length < 3) return duration ? `across ${formatDuration(duration)}` : null;
  const lo = Math.min(...pts);
  const hi = Math.max(...pts);
  return hi - lo <= 40
    ? `steady across the full ${formatDuration(duration)}`
    : `ranged ${Math.round(lo)}–${Math.round(hi)} WPM`;
}

function barColor(score) {
  return `rgb(var(--c-${score >= 8 ? 'good' : score >= 6 ? 'brand-500' : score >= 4 ? 'warn' : 'brand-700'}))`;
}

function formatDuration(s) {
  if (!s) return '—';
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}
