// Filler-word detection.
//
// Three kinds of fillers, in order of how reliably they can be detected:
//   1. Vocalized hesitations (um, uh, er, hmm…) — unambiguous. Matched by regex
//      so every elongation/variant (umm, ummm, uhm, uhh, err, hmmm…) is caught
//      and folded into one canonical label.
//   2. Multi-word phrases (you know, i mean, kind of…) — matched greedily,
//      longest phrase first.
//   3. Crutch / discourse words (like, so, well, actually…) — the classic verbal
//      fillers public-speaking coaches flag. NOTE: these are context-dependent
//      (a word list can't tell filler "like" from the verb "like" without NLP),
//      so they favor recall — a deliberate choice for a coaching tool.

// 1) Vocalized hesitations — pattern-matched, tolerant of elongation & variants.
const VOCAL_FILLERS = [
  { canon: 'uh-huh', re: /^u+h+u+h+$/ }, // uh-huh → "uhhuh" (check before "uh")
  { canon: 'um', re: /^u+h?m+$/ },   // um, umm, ummm, uhm, uhmm
  { canon: 'um', re: /^e+m+$/ },     // em, emm (Whisper sometimes writes "um" as "em")
  { canon: 'uh', re: /^u+h+$/ },     // uh, uhh, uhhh
  { canon: 'er', re: /^e+r+m*$/ },   // er, err, erm, ermm
  { canon: 'hmm', re: /^h+m+$/ },    // hm, hmm, hmmm
  { canon: 'mhm', re: /^m+h+m*$/ },  // mhm, mmhm, mm-hmm → "mmhmm"
  { canon: 'mm', re: /^m{2,}$/ },    // mm, mmm
  { canon: 'huh', re: /^h+u+h*$/ },  // huh, huhh
  { canon: 'ugh', re: /^u+g+h*$/ },  // ugh, uggh
  { canon: 'ah', re: /^a+h+$/ },     // ah, ahh
  { canon: 'eh', re: /^e+h+$/ },     // eh, ehh
];

// 3) Single-word crutch / discourse-marker fillers.
const WORD_FILLERS = new Set([
  'like', 'so', 'well', 'right', 'okay', 'ok', 'actually', 'basically',
  'literally', 'seriously', 'honestly', 'obviously', 'totally', 'essentially',
  'anyway', 'anyways',
]);

// 2) Multi-word phrase fillers — matched greedily, longest first.
const PHRASE_FILLERS = [
  'you know what i mean',
  'you know what im saying',
  'at the end of the day',
  'you know',
  'i mean',
  'i guess',
  'kind of',
  'sort of',
  'or something',
  'or whatever',
  'and stuff',
  'and everything',
  'you see',
]
  .map((text) => ({ text, tokens: text.split(' ') }))
  .sort((a, b) => b.tokens.length - a.tokens.length);

const clean = (word) => (word || '').toLowerCase().replace(/[^a-z']/g, '');

// Canonical filler label for a single token, or null if it isn't a filler.
export function fillerLabel(word) {
  const w = clean(word);
  if (!w) return null;
  if (WORD_FILLERS.has(w)) return w;
  for (const { canon, re } of VOCAL_FILLERS) {
    if (re.test(w)) return canon;
  }
  return null;
}

export function detectFillerWords(words) {
  const counts = {};

  for (let i = 0; i < words.length; i++) {
    // Phrases first (greedy, longest match wins) so "you know" isn't missed.
    let matchedPhrase = false;
    for (const ph of PHRASE_FILLERS) {
      const n = ph.tokens.length;
      if (i + n > words.length) continue;
      let ok = true;
      for (let k = 0; k < n; k++) {
        if (clean(words[i + k].word) !== ph.tokens[k]) {
          ok = false;
          break;
        }
      }
      if (ok) {
        counts[ph.text] = (counts[ph.text] || 0) + 1;
        i += n - 1; // consume the whole phrase
        matchedPhrase = true;
        break;
      }
    }
    if (matchedPhrase) continue;

    const label = fillerLabel(words[i].word);
    if (label) counts[label] = (counts[label] || 0) + 1;
  }

  return counts;
}

export function isFillerWord(word) {
  return fillerLabel(word) !== null;
}

// Collapse a run of the SAME vocal hesitation that Whisper emits as several
// tokens for ONE sustained sound ("ummmmm" → "um um um um") into a single
// occurrence. Consecutive same-label hesitations separated by only a small gap
// are treated as one "um": the first token's start through the last's end.
// Only vocal hesitations collapse (um/uh/er/…); real repeated words are left
// alone. This is what keeps a long "um" from being counted five times.
const REPEAT_MAX_GAP_S = 0.8;
export function collapseRepeatedFillers(words) {
  const out = [];
  for (const w of words || []) {
    const label = fillerLabel(w.word);
    const prev = out[out.length - 1];
    const prevLabel = prev ? fillerLabel(prev.word) : null;
    if (
      label &&
      isHesitation(label) &&
      prevLabel === label &&
      (w.start ?? 0) - (prev.end ?? prev.start ?? 0) <= REPEAT_MAX_GAP_S
    ) {
      // Same sustained hesitation — extend the previous one instead of adding.
      prev.end = w.end ?? prev.end;
      continue;
    }
    out.push({ ...w });
  }
  return out;
}

// Which word indices are part of a filler — same greedy phrase+single logic as
// detectFillerWords, so the transcript can highlight exactly what gets counted
// (a phrase like "you know" marks both words but counts as one occurrence).
export function markFillerWords(words) {
  const marked = new Set();
  for (let i = 0; i < words.length; i++) {
    let matchedPhrase = false;
    for (const ph of PHRASE_FILLERS) {
      const n = ph.tokens.length;
      if (i + n > words.length) continue;
      let ok = true;
      for (let k = 0; k < n; k++) {
        if (clean(words[i + k].word) !== ph.tokens[k]) {
          ok = false;
          break;
        }
      }
      if (ok) {
        for (let k = 0; k < n; k++) marked.add(i + k);
        i += n - 1;
        matchedPhrase = true;
        break;
      }
    }
    if (matchedPhrase) continue;
    if (fillerLabel(words[i].word)) marked.add(i);
  }
  return marked;
}

// --- Interim-capture support -------------------------------------------------
// Whisper's training data mostly omits disfluencies, so it drops or mangles
// "um"/"uh" (tiny.en almost always; base.en often — verified: "um" came back as
// "am"/"un", "uh" as "awe"). The live recognizer's INTERIM hypotheses still
// contain them before the final transcript scrubs them, so we count hesitations
// there and take the per-label MAX of (whisper, interim) — max, not sum, so a
// filler both engines caught isn't counted twice. Only unambiguous vocal
// hesitations merge this way; crutch words repeat across interim updates and
// would over-count.

const HESITATION_CANON = new Set(['um', 'uh', 'er', 'ah', 'hmm', 'mm', 'eh', 'huh', 'ugh']);

export function isHesitation(label) {
  return HESITATION_CANON.has(label);
}

// Count vocal hesitations in one interim hypothesis string → { um: 2, uh: 1 }.
export function countHesitations(text) {
  const counts = {};
  for (const token of (text || '').split(/\s+/)) {
    const label = fillerLabel(token);
    if (label && HESITATION_CANON.has(label)) counts[label] = (counts[label] || 0) + 1;
  }
  return counts;
}

// Merge whisper-derived counts with interim-derived hesitation counts.
export function mergeFillerCounts(whisperCounts, interimCounts) {
  const merged = { ...whisperCounts };
  for (const [label, n] of Object.entries(interimCounts || {})) {
    if (!HESITATION_CANON.has(label)) continue;
    merged[label] = Math.max(merged[label] || 0, n);
  }
  return merged;
}
