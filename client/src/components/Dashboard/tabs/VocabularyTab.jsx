import { fillerLabel } from '../../../utils/fillerWords.js';

// Vocabulary tab — makes the "unique words" number actually usable. It explains
// in plain terms what unique vs. repeated means, shows the real breakdown, and
// (the useful part) surfaces the exact content words you leaned on so you know
// what to vary next time. Reads results.words / transcript; changes nothing else.

// Common function words carry sentences but aren't worth flagging as repetitive
// ("the" ten times is normal). Excluding them surfaces the meaningful repeats.
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'so', 'if', 'then', 'that', 'this', 'these', 'those',
  'i', 'im', 'ive', 'id', 'you', 'youre', 'we', 'they', 'he', 'she', 'it', 'its', 'me', 'my',
  'your', 'our', 'their', 'his', 'her', 'them', 'us', 'is', 'am', 'are', 'was', 'were', 'be',
  'been', 'being', 'do', 'does', 'did', 'have', 'has', 'had', 'will', 'would', 'can', 'could',
  'should', 'to', 'of', 'in', 'on', 'at', 'for', 'with', 'from', 'by', 'as', 'about', 'into',
  'out', 'up', 'down', 'over', 'not', 'no', 'yes', 'just', 'very', 'too', 'also', 'here',
  'there', 'what', 'when', 'where', 'who', 'how', 'why', 'which', 'because', 'get', 'got',
  'go', 'going', 'gonna', 'wanna', 'now', 'all', 'some', 'any', 'more', 'most', 'than',
]);

export default function VocabularyTab({ results }) {
  const { transcript, words } = results;
  const tokens = (transcript || (words || []).map((w) => w.word).join(' '))
    .toLowerCase()
    .match(/[a-z']+/g) || [];

  const total = tokens.length;
  const unique = new Set(tokens).size;
  const ratio = total ? Math.round((unique / total) * 100) : 0;
  const inRange = ratio >= 50;

  // Content words you repeated: exclude stopwords and fillers, keep count >= 3.
  const freq = {};
  for (const t of tokens) {
    if (STOPWORDS.has(t) || fillerLabel(t)) continue;
    freq[t] = (freq[t] || 0) + 1;
  }
  const repeated = Object.entries(freq)
    .filter(([, n]) => n >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxCount = repeated[0]?.[1] || 1;

  if (total < 20) {
    return (
      <div className="card text-center py-10 text-sm text-ink/50">
        Record a longer take (about 40+ words) to see a meaningful vocabulary breakdown.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* The number, explained */}
      <div className="card">
        <div className="flex items-baseline justify-between mb-3">
          <div className="flex items-baseline gap-2">
            <span className={`font-display text-4xl font-semibold tabular-nums ${inRange ? 'text-emerald-600' : 'text-amber-600'}`}>
              {ratio}%
            </span>
            <span className="text-sm font-medium text-ink/45">unique words</span>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${inRange ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {inRange ? 'Good variety' : 'Fairly repetitive'}
          </span>
        </div>

        {/* Total vs unique, shown as a bar so "same" is concrete */}
        <div className="relative h-2.5 rounded-full bg-sand overflow-hidden">
          <div className="absolute inset-y-0 left-0 bg-brand-400 rounded-full" style={{ width: `${ratio}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-xs text-ink/50 tabular-nums">
          <span><span className="font-semibold text-ink/70">{unique}</span> different words</span>
          <span><span className="font-semibold text-ink/70">{total}</span> words total</span>
        </div>

        <p className="mt-4 text-sm text-ink/65 leading-relaxed">
          You spoke {total} words, but only {unique} of them were different. That is {ratio}% unique.
          {inRange
            ? ' Varied wording keeps an audience engaged and makes you sound in command of the topic.'
            : ' A few words are doing a lot of the work. Swapping in alternatives will make the talk feel richer and hold attention longer.'}
        </p>
      </div>

      {/* The actionable part: what you leaned on */}
      <div className="card">
        <h3 className="font-semibold text-ink/80 mb-1">Words you leaned on</h3>
        <p className="text-xs text-ink/45 mb-4">
          Content words you used three or more times. Common words like "the" and "and" are left out.
        </p>
        {repeated.length === 0 ? (
          <p className="text-sm text-ink/55">
            No single content word stood out as overused. Nicely balanced.
          </p>
        ) : (
          <>
            <div className="space-y-2.5">
              {repeated.map(([word, count]) => (
                <div key={word} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-sm font-medium text-ink/70 truncate">{word}</span>
                  <div className="flex-1 h-5 bg-sand rounded-full overflow-hidden">
                    <div className="h-full bg-brand-400 rounded-full transition-all duration-500" style={{ width: `${(count / maxCount) * 100}%` }} />
                  </div>
                  <span className="w-8 shrink-0 text-sm font-bold text-ink/70 tabular-nums text-right">×{count}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-ink/60 leading-relaxed">
              For your top one or two, write down two or three alternatives before your next take, then
              swap them in. It is the fastest way to raise the number above.
            </p>
          </>
        )}
      </div>

      {/* Plain explainer: what "the same" actually means */}
      <div className="card bg-cream border-sand">
        <h3 className="text-sm font-semibold text-ink/80 mb-2">What counts as the same word</h3>
        <ul className="space-y-1.5 text-sm text-ink/60 leading-relaxed">
          <li>Every time you repeat a word, it adds to your total but not to your different-word count. Say "problem" five times and that is five words but one unique word.</li>
          <li>Different forms count separately. "speak", "speaks", and "speaking" are three different words here.</li>
          <li>Filler words like "um" and "like" are measured in the Filler Words tab, so they are left out of this count.</li>
        </ul>
      </div>
    </div>
  );
}
