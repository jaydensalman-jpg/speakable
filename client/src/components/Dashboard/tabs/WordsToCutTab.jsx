import { detectWeakWords, WEAK_CATEGORIES } from '../../../utils/weakWords.js';

// Words to Cut — surfaces low-value language (hedges, empty qualifiers, vague
// words) from the full transcript so the user can see what to trim. Reads the
// same word list the transcript shows. Deliberately gentle: it frames these as
// "worth trimming," never as failure, and celebrates tight language.
export default function WordsToCutTab({ results }) {
  const words = results.displayWords || results.words || [];
  const wordCount = words.length;
  const { total, items } = detectWeakWords(words);
  const pct = wordCount ? (total / wordCount) * 100 : 0;
  const duration = results.duration || 0;
  const perMin = duration > 0 ? (total / (duration / 60)).toFixed(1) : '0.0';
  const tight = pct < 4; // forgiving threshold — everyone uses a few

  if (wordCount < 20) {
    return (
      <div className="card text-center py-10 text-sm text-ink/50">
        Record a longer take (about 40+ words) to see which words are worth trimming.
      </div>
    );
  }

  const byCategory = Object.keys(WEAK_CATEGORIES)
    .map((key) => ({ key, ...WEAK_CATEGORIES[key], items: items.filter((it) => it.category === key) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="card">
        <div className="flex items-baseline justify-between mb-3">
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-semibold tracking-tight tabular-nums ${tight ? 'text-emerald-600' : 'text-amber-600'}`}>
              {total}
            </span>
            <span className="text-sm font-medium text-ink/45">words worth trimming</span>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${tight ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {tight ? 'Tight language' : 'Room to trim'}
          </span>
        </div>
        <p className="text-sm text-ink/65 leading-relaxed">
          {total === 0
            ? 'None found. Your wording stayed direct and specific.'
            : tight
              ? `${total} low-value word${total === 1 ? '' : 's'} across your talk (${perMin} per minute). That is light. Trim the one or two you repeat most and it will read even cleaner.`
              : `${total} low-value words across your talk (${perMin} per minute). These add no meaning. Cutting the ones you lean on will make you sound more certain and more specific.`}
        </p>
      </div>

      {/* Grouped breakdown */}
      {byCategory.map((group) => {
        const max = group.items[0]?.count || 1;
        return (
          <div key={group.key} className="card">
            <h3 className="font-semibold text-ink/80">{group.label}</h3>
            <p className="text-xs text-ink/45 mt-0.5 mb-4">{group.why}</p>
            <div className="space-y-2.5">
              {group.items.map((it) => (
                <div key={it.text} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 truncate text-sm font-medium text-ink/70">"{it.text}"</span>
                  <div className="h-5 flex-1 overflow-hidden rounded-full bg-sand">
                    <div className="h-full rounded-full bg-amber-400 transition-all duration-500" style={{ width: `${(it.count / max) * 100}%` }} />
                  </div>
                  <span className="w-8 shrink-0 text-right text-sm font-bold text-ink/70 tabular-nums">×{it.count}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 rounded-2xl bg-cream border border-sand px-4 py-2.5 text-sm text-ink/60">
              {group.swap}
            </p>
          </div>
        );
      })}

      {total > 0 && (
        <p className="text-xs text-ink/40 text-center">
          These are not wrong to use now and then. The goal is trimming the ones you lean on, not removing every one.
        </p>
      )}
    </div>
  );
}
