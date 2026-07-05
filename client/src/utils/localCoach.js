// On-device coaching engine — generates the report shape the Dashboard consumes
//   { overallScore, categoryScores, feedback, tips, highlights }
// purely from metrics computed in the browser. No API key, no network, no cost.
//
// Design principle: scores must be EARNED. A short or sparse sample cannot score
// high — there simply isn't enough evidence. We gate insufficient samples and cap
// every score by how much you actually said, so 4 words in 5 seconds scores low.

const clamp = (n) => Math.max(1, Math.min(10, Math.round(n)));
const clamp01 = (n) => Math.max(0, Math.min(1, n));
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
const stddev = (arr) => {
  if (arr.length < 2) return 0;
  const m = avg(arr);
  return Math.sqrt(avg(arr.map((x) => (x - m) ** 2)));
};

// What counts as enough speech to fairly judge.
const MIN_WORDS = 25; // below this we won't pretend to grade
const MIN_SECONDS = 12;
const FULL_WORDS = 80; // earns full "sample sufficiency"
const FULL_SECONDS = 45;

export function generateLocalFeedback({
  transcript = '',
  fillerWordCounts = {},
  avgWpm = 0,
  wpmData = [],
  pauses = [],
  volumeStdDev = 0,
  duration = 0,
  words = [],
}) {
  // ---- Derived metrics --------------------------------------------------
  const wordCount = words.length || (transcript.trim() ? transcript.trim().split(/\s+/).length : 0);
  const fillerTotal = Object.values(fillerWordCounts).reduce((a, b) => a + b, 0);
  const fillerPct = wordCount ? (fillerTotal / wordCount) * 100 : 0;
  const topFiller = Object.entries(fillerWordCounts)
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const tokens = transcript.toLowerCase().match(/[a-z']+/g) || [];
  const ttr = tokens.length ? new Set(tokens).size / tokens.length : 0;
  const longWordPct = tokens.length
    ? (tokens.filter((w) => w.length >= 7).length / tokens.length) * 100
    : 0;

  const paceValues = wpmData.map((d) => d.wpm).filter((n) => n > 0);
  const paceSwing = stddev(paceValues);
  const minutes = Math.max(duration / 60, 0.01);
  const pauseRate = pauses.length / minutes;

  // Articulation signal: recognizer confidence per word (0–1), where available.
  const confVals = words.map((w) => w.confidence).filter((c) => typeof c === 'number' && c > 0);
  const hasConf = confVals.length > 0;
  const avgConf = hasConf ? avg(confVals) : null;
  const lowConfCount = words.filter((w) => typeof w.confidence === 'number' && w.confidence > 0 && w.confidence < 0.6).length;

  // How much we trust this as a real sample (0–1).
  const sufficiency = clamp01(Math.min(wordCount / FULL_WORDS, duration / FULL_SECONDS));

  // ---- Gate: not enough speech to grade --------------------------------
  if (wordCount < MIN_WORDS || duration < MIN_SECONDS) {
    const overall = wordCount < 8 ? 1 : 2;
    const tooFew = `${wordCount} word${wordCount === 1 ? '' : 's'} in ${Math.round(duration)}s`;
    return {
      overallScore: overall,
      categoryScores: { clarity: overall, structure: overall, vocabulary: overall, confidence: overall },
      feedback: {
        clarity: `${tooFew} is too short to analyze. Record at least 30–45 seconds.`,
        structure: `Not enough to assess structure — no opening, point, or close. Speak a few connected sentences.`,
        vocabulary: `Too few words to measure vocabulary (needs roughly 40+).`,
        confidence: `Too short to read delivery. Record a sustained minute.`,
      },
      tips: [
        `Record 30–60 seconds on a topic you know, in full sentences.`,
        `Open with a sentence, make one point, then close.`,
        `Re-run the analysis once you have a longer take.`,
      ],
      highlights: [],
      meta: { insufficient: true, wordCount, duration: Math.round(duration) },
    };
  }

  // ---- Strict category scores (1–10) -----------------------------------
  // Cap everything by sample size: a borderline-short clip cannot max out.
  const cap = 3 + 7 * sufficiency;

  // Clarity = articulation (recognizer confidence) minus fillers and extreme pace.
  let clarity = hasConf ? avgConf * 10 : 7;
  if (fillerPct > 8) clarity -= 4;
  else if (fillerPct > 5) clarity -= 3;
  else if (fillerPct > 3) clarity -= 2;
  else if (fillerPct > 1.5) clarity -= 1;
  if (avgWpm > 185 || (avgWpm > 0 && avgWpm < 90)) clarity -= 2;
  else if (avgWpm > 170 || (avgWpm > 0 && avgWpm < 105)) clarity -= 1;
  if (lowConfCount >= 3) clarity -= 1;
  clarity = clamp(Math.min(clarity, cap));

  // Structure must be earned through length, steady pace, and controlled pauses.
  let structure = 4;
  structure += 3 * sufficiency;
  if (paceValues.length > 2) {
    if (paceSwing < 25) structure += 2;
    else if (paceSwing < 40) structure += 1;
  }
  if (pauseRate > 4) structure -= 2;
  else if (pauseRate > 2) structure -= 1;
  if (fillerPct > 10) structure -= 2; // heavy fillers fragment the flow
  else if (fillerPct > 6) structure -= 1;
  structure = clamp(Math.min(structure, cap));

  // Vocabulary needs a real word count before variety means anything.
  let vocabulary;
  if (tokens.length < 30) {
    vocabulary = clamp(Math.min(2 + tokens.length / 12, cap));
  } else {
    vocabulary = ttr > 0.62 ? 8 : ttr > 0.52 ? 7 : ttr > 0.42 ? 6 : ttr > 0.35 ? 5 : 4;
    if (longWordPct > 18) vocabulary += 1;
    if (fillerPct > 6) vocabulary -= 1;
    vocabulary = clamp(Math.min(vocabulary, cap));
  }

  // Confidence: articulation + expressive delivery, minus hesitation and rushing.
  let confidence = hasConf ? avgConf * 9 : 6.5;
  if (fillerPct > 8) confidence -= 3;
  else if (fillerPct > 5) confidence -= 2;
  else if (fillerPct > 3) confidence -= 1;
  if (pauseRate > 3) confidence -= 1;
  if (avgWpm > 190) confidence -= 1;
  if (volumeStdDev > 0) {
    if (volumeStdDev < 2) confidence -= 1;
    else if (volumeStdDev <= 9) confidence += 1;
  }
  confidence = clamp(Math.min(confidence, cap));

  const overallScore = clamp(Math.min((clarity + structure + vocabulary + confidence) / 4, cap));

  // ---- Narrative feedback ----------------------------------------------
  const pct = (n) => `${n.toFixed(1)}%`;
  const artNote = hasConf
    ? lowConfCount > 0
      ? ` ${lowConfCount} word${lowConfCount === 1 ? '' : 's'} were hard to make out (${Math.round(avgConf * 100)}% avg recognition confidence) — likely mumbled.`
      : ` Articulation was clear (${Math.round(avgConf * 100)}% recognition confidence).`
    : '';

  const feedback = {
    clarity:
      (fillerPct <= 3
        ? `Fillers were ${pct(fillerPct)} of your words — clean.`
        : `Fillers were ${pct(fillerPct)} of your words${topFiller ? `, mostly "${topFiller}"` : ''}. Aim under 3%.`) +
      artNote,
    structure:
      paceValues.length > 2 && paceSwing <= 25
        ? `Pace held steady across the talk — easy to follow.`
        : `Pace varied between sections${pauses.length ? ` with ${pauses.length} long pause${pauses.length === 1 ? '' : 's'}` : ''}. An outline will tighten the flow.`,
    vocabulary:
      vocabulary >= 7
        ? `Varied word choice (${Math.round(ttr * 100)}% unique words).`
        : `Repetitive word choice (${Math.round(ttr * 100)}% unique words). Vary your phrasing.`,
    confidence:
      confidence >= 7
        ? `Composed, steady delivery${volumeStdDev >= 2 && volumeStdDev <= 9 ? ' with good vocal range' : ''}.`
        : `Some hesitation${fillerPct > 4 ? ` from fillers` : ''}${avgWpm > 190 ? ` and a fast pace` : ''}. Worth tightening.`,
  };

  // ---- Tips (most relevant first) --------------------------------------
  const tipPool = [
    { sev: fillerPct, when: fillerPct > 2, text: `Replace fillers with a short pause${topFiller ? ` — especially "${topFiller}"` : ''}.` },
    { sev: lowConfCount * 6, when: lowConfCount >= 3, text: `${lowConfCount} words were unclear. Slow down and enunciate word endings.` },
    { sev: avgWpm > 185 ? 30 : avgWpm > 170 ? 18 : 0, when: avgWpm > 170, text: `Slow down — you averaged ${Math.round(avgWpm)} WPM. Target 120–160.` },
    { sev: avgWpm > 0 && avgWpm < 105 ? 20 : 0, when: avgWpm > 0 && avgWpm < 105, text: `Pick up the pace — ${Math.round(avgWpm)} WPM is slow. Target 120–160.` },
    { sev: pauseRate > 2 ? 16 : 0, when: pauseRate > 2, text: `${pauses.length} long pause${pauses.length === 1 ? '' : 's'}. Rehearse your opening to cut hesitation.` },
    { sev: volumeStdDev > 0 && volumeStdDev < 2 ? 14 : 0, when: volumeStdDev > 0 && volumeStdDev < 2, text: `Delivery was flat. Vary your volume on key words.` },
    { sev: ttr < 0.5 && tokens.length >= 30 ? 12 : 0, when: ttr < 0.5 && tokens.length >= 30, text: `Reduce repeated words — plan a few key phrases in advance.` },
  ];
  let tips = tipPool.filter((t) => t.when).sort((a, b) => b.sev - a.sev).slice(0, 3).map((t) => t.text);
  const fallbackTips = [
    `Record the same talk twice and compare.`,
    `Watch the muted video for body language, then listen to the audio for tone.`,
    `End on a clear, full stop.`,
  ];
  for (const f of fallbackTips) {
    if (tips.length >= 3) break;
    if (!tips.includes(f)) tips.push(f);
  }

  // ---- Highlights — only genuine, earned strengths ---------------------
  const canPraise = sufficiency >= 0.5; // don't credit a borderline-short clip
  const highlightPool = [
    { ok: canPraise && fillerPct <= 2 && wordCount >= 40, text: `Filler rate ${pct(fillerPct)} — well controlled.` },
    { ok: canPraise && avgWpm >= 120 && avgWpm <= 160, text: `Pace ${Math.round(avgWpm)} WPM — in the ideal range.` },
    { ok: canPraise && hasConf && avgConf >= 0.9 && lowConfCount === 0, text: `Clear articulation (${Math.round(avgConf * 100)}% recognition confidence).` },
    { ok: canPraise && vocabulary >= 7, text: `Varied vocabulary (${Math.round(ttr * 100)}% unique words).` },
    { ok: canPraise && confidence >= 7, text: `Steady, composed delivery.` },
  ];
  const highlights = highlightPool.filter((h) => h.ok).map((h) => h.text).slice(0, 2);

  return {
    overallScore,
    categoryScores: { clarity, structure, vocabulary, confidence },
    feedback,
    tips,
    highlights,
    meta: { insufficient: false, sufficiency: Math.round(sufficiency * 100) / 100, avgConfidence: avgConf, lowConfCount },
  };
}
