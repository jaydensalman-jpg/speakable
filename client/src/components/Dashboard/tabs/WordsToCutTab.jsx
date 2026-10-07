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
      {/* .data-lead — no rule under it here; .cut-groups carries the top border. */}
      <div className="pb-4 md:pb-6">
        <p className="eyebrow">Words to cut</p>

        {/* .cut-headline — the numeral and the heading sit on their bottom edge. */}
        <div className="mt-4 flex items-center gap-6 md:items-end">
          <p className="font-display text-[3rem] leading-none tracking-[-0.025em] text-brand-500 md:text-[4rem]">
            {total}
          </p>
          {/* font-sans explicitly: the global h2 rule is the display face, and
              DM Serif Display has one weight, so 500 would synthesise a bold. */}
          <h2 className="font-sans text-[1.25rem] font-medium text-ink md:pb-[0.6rem] md:text-[1.375rem]">
            Words Worth Trimming
          </h2>
        </div>
      </div>

      {/* .cut-groups / .cut-group — heading spans both rows of the left column,
          with the words and the swap stacked in the right. */}
      <div className="border-t border-sand">
        {byCategory.map((group) => (
          <section
            key={group.key}
            className="grid grid-cols-1 gap-y-6 border-b border-sand py-8 md:grid-cols-2 md:gap-x-12 md:gap-y-0"
          >
            <div className="md:row-span-2">
              <h3 className="statement">{group.label}</h3>
              <p className="body-copy mt-2">{group.why}</p>
            </div>

            <div className="grid gap-3">
              {group.items.map((it) => (
                <div
                  key={it.text}
                  className="flex justify-between gap-4 border-b border-sand pb-3 text-[1.0625rem]"
                >
                  <span>&ldquo;{display(it.text)}&rdquo;</span>
                  <span className="shrink-0 tabular-nums text-muted">{it.count}&times;</span>
                </div>
              ))}
            </div>

            <p className="mt-4 text-[0.9375rem] leading-[1.55] text-muted">
              <span className="mr-2 text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-brand-500">
                Try
              </span>
              {group.swap}
            </p>
          </section>
        ))}
      </div>

      {total > 0 && (
        <p className="body-copy mt-8 max-w-[48rem]">
          These are not wrong to use now and then. The goal is trimming the ones you lean on, not
          removing every one.
        </p>
      )}
    </div>
  );
}

// Phrases are matched in lowercase. Only the first-person "I" is restored —
// capitalising anything else would change a word the speaker did not say.
function display(text) {
  return text.replace(/\bi\b/g, 'I');
}
