import { fillerLabel } from './fillerWords.js';

// "Words to cut" — low-value language that dilutes a point: hedges that leak
// uncertainty, empty qualifiers that pad, and vague nouns that stay fuzzy. This
// is DISTINCT from fillerWords.js (vocal tics / discourse markers) and is kept
// non-overlapping (a token already flagged as a filler is skipped) so nothing is
// counted twice. Deliberately lean and forgiving — everyone uses these
// occasionally; the value is seeing the ones you lean on.

const clean = (w) => (w || '').toLowerCase().replace(/[^a-z']/g, '');

export const WEAK_CATEGORIES = {
  hedge: {
    label: 'Hedges',
    why: 'These soften your point and make you sound unsure of your own idea.',
    swap: 'Say it plainly. "I think we should" becomes "We should."',
  },
  qualifier: {
    label: 'Empty qualifiers',
    why: 'These pad a sentence without adding meaning.',
    swap: 'Cut it, or pick a stronger word. "Very important" becomes "critical."',
  },
  vague: {
    label: 'Vague words',
    why: 'These leave the point fuzzy instead of naming the specific thing.',
    swap: 'Name it. "Some things" becomes the actual items you mean.',
  },
};

// Ordered longest-first so multi-word hedges match before their pieces.
const WEAK = [
  ['i think', 'hedge'], ['i feel like', 'hedge'], ['i believe', 'hedge'], ['i would say', 'hedge'],
  ['maybe', 'hedge'], ['probably', 'hedge'], ['perhaps', 'hedge'], ['possibly', 'hedge'],
  ['very', 'qualifier'], ['really', 'qualifier'], ['just', 'qualifier'], ['quite', 'qualifier'],
  ['pretty', 'qualifier'], ['super', 'qualifier'], ['somewhat', 'qualifier'], ['a little', 'qualifier'],
  ['a bit', 'qualifier'], ['kinda', 'qualifier'],
  ['things', 'vague'], ['something', 'vague'], ['someone', 'vague'], ['everything', 'vague'], ['anything', 'vague'],
]
  .map(([text, category]) => ({ text, category, tokens: text.split(' ') }))
  .sort((a, b) => b.tokens.length - a.tokens.length);

// Scan the transcript words → { total, items:[{text, count, category}] }.
export function detectWeakWords(words) {
  const list = words || [];
  const counts = {}; // text -> { count, category }
  for (let i = 0; i < list.length; i++) {
    if (fillerLabel(list[i].word)) continue; // never double-count a vocal filler
    let matched = null;
    for (const w of WEAK) {
      const n = w.tokens.length;
      if (i + n > list.length) continue;
      let ok = true;
      for (let k = 0; k < n; k++) {
        if (clean(list[i + k].word) !== w.tokens[k]) { ok = false; break; }
      }
      if (ok) { matched = w; break; }
    }
    if (matched) {
      const entry = counts[matched.text] || (counts[matched.text] = { count: 0, category: matched.category });
      entry.count += 1;
      i += matched.tokens.length - 1;
    }
  }
  const items = Object.entries(counts)
    .map(([text, v]) => ({ text, count: v.count, category: v.category }))
    .sort((a, b) => b.count - a.count);
  return { total: items.reduce((a, b) => a + b.count, 0), items };
}
