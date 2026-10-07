import { fillerLabel } from '../../../utils/fillerWords.js';
import RankedBars from '../../ui/ranked-bars.jsx';

// Vocabulary — rebuilt Oct 2026 from the Figma Make redesign: cardless, the
// ratio carried by a large numeral, the raw unique/total counts stated plainly
// underneath, then the content words you actually leaned on. Everything is
// computed from this take's transcript; nothing is written as a literal.

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

  if (total < 20) {
    return (
      <div className="animate-rise py-10 text-center text-sm text-ink/50">
        Record a longer take (about 40+ words) to see a meaningful vocabulary breakdown.
      </div>
    );
  }

  return (
    <div className="animate-rise">
      <section className="sheet">
        <p className="eyebrow">Vocabulary</p>

        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <p className="stat-xl text-[3rem] text-brand-500 md:text-[4rem]">{ratio}%</p>
            <p className="caption mt-2 tabular-nums">
              unique words · {unique.toLocaleString()} different out of {total.toLocaleString()}
            </p>
          </div>
          <span className={inRange ? 'pill-good' : 'pill-warn'}>
            {inRange ? 'Good variety' : 'Fairly repetitive'}
          </span>
        </div>

        <p className="statement mt-7 max-w-prose">
          {inRange
            ? 'Varied wording keeps an audience with you.'
            : 'A few words are doing most of the work.'}
        </p>
      </section>

      <section className="sheet">
        <p className="eyebrow">Words you leaned on</p>
        <p className="caption mt-2 max-w-prose">
          Content words you used three or more times. Common words like &ldquo;the&rdquo; and
          &ldquo;and&rdquo; are left out.
        </p>

        {repeated.length === 0 ? (
          <p className="mt-5 text-[1.0625rem] text-ink/60">
            No single content word stood out as overused. Nicely balanced.
          </p>
        ) : (
          <>
            <RankedBars rows={repeated} />
            <p className="body-copy mt-6 max-w-[48rem]">
              Pick your top words, come up with two or three alternatives, and try swapping them
              into your next take.
            </p>
          </>
        )}
      </section>

      <section className="sheet grid gap-4 md:grid-cols-[14rem_1fr] md:gap-8">
        <p className="statement">What counts as the same word</p>
        <ul className="space-y-2 text-[1.0625rem] leading-[1.65] text-muted">
          <li>
            Every repeat adds to your total but not to your different-word count. Say
            &ldquo;problem&rdquo; five times and that is five words but one unique word.
          </li>
          <li>
            Different forms count separately. &ldquo;speak&rdquo;, &ldquo;speaks&rdquo; and
            &ldquo;speaking&rdquo; are three different words here.
          </li>
          <li>Fillers like &ldquo;um&rdquo; are measured in Filler Words, so they are left out.</li>
        </ul>
      </section>
    </div>
  );
}
