import { detectWeakWords } from '../../../utils/weakWords.js';

// Coaching — rebuilt Oct 2026 from the Figma Make redesign: cardless, numbered
// drills with a "try this" block each. New reports carry feedback.coaching —
// the 2–3 weakest areas from THIS take, each with the real numbers (and
// timestamps where measured) plus one concrete drill, all built in
// utils/localCoach.js. Nothing on this tab is written as a literal; the count in
// the heading is derived from how many drills the report actually produced.
// Sessions saved by older builds have no coaching array → legacy view below.

const COUNT_WORD = { 1: 'One thing', 2: 'Two things', 3: 'Three things' };

export default function AIFeedbackTab({ results }) {
  const { feedback } = results;
  const coaching = feedback.coaching || null;

  // A short "also keep an eye on" list: every off-target metric as a one-liner,
  // plus weak-word load if notable. Complements the detailed drills.
  const also = [];
  (feedback.breakdown || [])
    .filter((m) => !m.inRange)
    .forEach((m) => also.push(`${m.label}: ${m.valueDisplay} · target ${m.targetDisplay}`));
  const weak = detectWeakWords(results.displayWords || results.words || []);
  if (weak.total >= 4) also.push(`Weak or empty words: ${weak.total} worth trimming (see Words to Cut)`);

  if (coaching) {
    const heading = COUNT_WORD[coaching.length] || `${coaching.length} things`;

    return (
      <div className="animate-rise">
        <section className="sheet">
          <p className="eyebrow">Your next take</p>
          <h2 className="mt-3 font-display text-[2.125rem] leading-[1.08] tracking-[-0.025em] text-ink md:text-[2.5rem]">
            {heading} to practice.
          </h2>
          <p className="caption mt-3 max-w-prose">
            Work on these in order. Keep everything else natural.
          </p>
        </section>

        {coaching.map((item, i) => (
          <section key={i} className="sheet">
            <p className="stat-xl text-[1.25rem] text-brand-500">
              {String(i + 1).padStart(2, '0')}
            </p>

            <h3 className="mt-3 font-display text-[1.75rem] leading-[1.15] tracking-[-0.025em] text-ink">
              {item.title}
            </h3>

            {item.body && (
              <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-ink/65">{item.body}</p>
            )}

            {item.drill && (
              <div className="mt-5 border-l-2 border-brand-200 pl-4">
                <p className="eyebrow text-brand-500">Try this</p>
                <p className="mt-1.5 max-w-prose text-[15px] leading-relaxed text-ink/75">
                  {item.drill}
                </p>
              </div>
            )}
          </section>
        ))}

        {also.length > 0 && (
          <section className="sheet">
            <p className="eyebrow">Also keep an eye on</p>
            <ul className="mt-4 list-disc space-y-2 pl-[1.1rem] text-[0.9375rem] leading-[1.6] text-muted marker:text-brand-500">
              {also.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </section>
        )}

        {feedback.highlights?.length > 0 && (
          <section className="sheet">
            <p className="eyebrow text-good">Working already</p>
            <ul className="mt-3 space-y-2">
              {feedback.highlights.map((h, i) => (
                <li key={i} className="text-[15px] leading-relaxed text-ink/70">{h}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="sheet">
          <p className="caption">Built on your device from this take&rsquo;s measurements.</p>
        </section>
      </div>
    );
  }

  // ---- Legacy view for sessions saved before the coaching rewrite ----
  const categories = [
    { key: 'clarity', label: 'Clarity' },
    { key: 'structure', label: 'Structure' },
    { key: 'vocabulary', label: 'Vocabulary' },
    { key: 'confidence', label: 'Confidence' },
  ];

  return (
    <div className="animate-rise">
      {feedback.tips?.length > 0 && (
        <section className="sheet">
          <p className="eyebrow">Three ways to improve</p>
          <ol className="mt-4">
            {feedback.tips.map((tip, i) => (
              <li key={i} className="flex gap-4 border-b border-sand py-4 last:border-b-0">
                <span className="stat-xl shrink-0 text-[16px] text-brand-500">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-[15px] leading-relaxed text-ink/70">{tip}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {categories.map(({ key, label }) => {
        const score = feedback.categoryScores?.[key];
        const text = feedback.feedback?.[key];
        if (!text) return null;
        return (
          <section key={key} className="sheet">
            <div className="flex items-start justify-between gap-3">
              <p className="eyebrow">{label}</p>
              {score != null && (
                <span className={score >= 6 ? 'pill-good' : 'pill-warn'}>{score}/10</span>
              )}
            </div>
            <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-ink/65">{text}</p>
          </section>
        );
      })}

      <section className="sheet">
        <p className="caption">Generated on your device from your speech.</p>
      </section>
    </div>
  );
}
