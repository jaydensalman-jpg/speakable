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
      {/* Lead: coral numeral with the heading set beside it on the baseline. */}
      <section className="sheet">
        <p className="eyebrow">Words to cut</p>

        <div className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <p className="stat-xl text-[3rem] text-brand-500 md:text-[4rem]">{total}</p>
          {/* font-sans explicitly: the global h2 rule is the display face, and
              DM Serif Display has one weight, so semibold would synthesise. */}
          <h2 className="font-sans text-[1.5rem] font-semibold tracking-[-0.02em] text-ink md:text-[1.875rem]">
            Words Worth Trimming
          </h2>
        </div>
      </section>

      {/* One row per category: name and why on the left, the words and the swap
          on the right. */}
      {byCategory.map((group) => (
        <section key={group.key} className="sheet grid gap-5 md:grid-cols-2 md:gap-14">
          <div>
            <h3 className="text-[1.375rem] font-semibold tracking-[-0.02em] text-ink md:text-[1.625rem]">
              {group.label}
            </h3>
            <p className="mt-3 max-w-prose text-[1.0625rem] leading-[1.6] text-muted">{group.why}</p>
          </div>

          <div>
            <ul>
              {group.items.map((it) => (
                <li
                  key={it.text}
                  className="flex items-baseline justify-between gap-4 border-b border-sand py-3"
                >
                  <span className="text-[1.0625rem] text-ink">&ldquo;{display(it.text)}&rdquo;</span>
                  <span className="shrink-0 text-[1.0625rem] tabular-nums text-muted">
                    {it.count}&times;
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-4 text-[1.0625rem] leading-[1.6] text-muted">
              <span className="eyebrow mr-3 text-brand-500">Try</span>
              {group.swap}
            </p>
          </div>
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

// Phrases are matched in lowercase. Only the first-person "I" is restored —
// capitalising anything else would change a word the speaker did not say.
function display(text) {
  return text.replace(/\bi\b/g, 'I');
}
