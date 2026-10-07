import { detectWeakWords, WEAK_CATEGORIES } from '../../../utils/weakWords.js';

// Words to Cut — rebuilt Oct 2026 from the Figma Make redesign: cardless, a
// large total, then one open section per category. The category labels, their
// explanations and the "try" lines all come from WEAK_CATEGORIES in
// utils/weakWords.js, which already groups exactly the way the design does, so
// nothing here is written as a literal.
//
// Deliberately gentle: it frames these as worth trimming, never as failure.
export default function WordsToCutTab({ results }) {
  const words = results.displayWords || results.words || [];
  const wordCount = words.length;
  const { total, items } = detectWeakWords(words);
  const pct = wordCount ? (total / wordCount) * 100 : 0;
  const duration = results.duration || 0;
  const perMin = duration > 0 ? (total / (duration / 60)).toFixed(1) : null;
  const tight = pct < 4; // forgiving threshold — everyone uses a few

  if (wordCount < 20) {
    return (
      <div className="animate-rise py-10 text-center text-sm text-ink/50">
        Record a longer take (about 40+ words) to see which words are worth trimming.
      </div>
    );
  }

  const byCategory = Object.keys(WEAK_CATEGORIES)
    .map((key) => ({ key, ...WEAK_CATEGORIES[key], items: items.filter((it) => it.category === key) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="animate-rise">
      <section className="sheet">
        <p className="eyebrow">Words to cut</p>

        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <p className="stat-xl text-[3rem] text-brand-500 md:text-[4rem]">{total}</p>
            <p className="caption mt-2">
              words worth trimming{perMin ? ` · ${perMin} per minute` : ''}
            </p>
          </div>
          <span className={tight ? 'pill-good' : 'pill-warn'}>
            {tight ? 'Tight language' : 'Room to trim'}
          </span>
        </div>

        <p className="statement mt-7 max-w-prose">
          {total === 0
            ? 'Your wording stayed direct and specific.'
            : tight
              ? 'That is light. Trim the one or two you repeat most.'
              : 'These add no meaning. Cutting the ones you lean on will sound more certain.'}
        </p>
      </section>

      {byCategory.map((group) => (
        <section key={group.key} className="sheet">
          <p className="eyebrow">{group.label}</p>
          <p className="caption mt-2 max-w-prose">{group.why}</p>

          <ul className="mt-5">
            {group.items.map((it) => (
              <li
                key={it.text}
                className="flex items-baseline justify-between gap-4 border-b border-sand py-3 last:border-b-0"
              >
                <span className="font-mono text-[15px] text-ink/75">&ldquo;{it.text}&rdquo;</span>
                <span className="stat-xl text-[1.25rem] text-ink/70">{it.count}&times;</span>
              </li>
            ))}
          </ul>

          <p className="mt-5 text-[15px] leading-relaxed text-ink/65">
            <span className="eyebrow mr-2 text-brand-500">Try</span>
            {group.swap}
          </p>
        </section>
      ))}

      {total > 0 && (
        <section className="sheet">
          <p className="caption max-w-prose">
            These are not wrong to use now and then. The goal is trimming the ones you lean on, not
            removing every one.
          </p>
        </section>
      )}
    </div>
  );
}
