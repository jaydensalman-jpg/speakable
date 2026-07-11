// On-device coaching engine — generates the report the Dashboard consumes,
// purely from metrics computed in the browser. No API key, no network, no cost.
//
// Design principles:
//  - Scores must be EARNED: short/sparse samples are gated, and every score is
//    capped by sample size (`cap = 3 + 7·sufficiency`).
//  - Scores must be TRANSPARENT: the overall score is the plain average of the
//    measured metrics in `breakdown`, each with its raw value, target, and the
//    points it contributes. A metric with no real data is omitted, never faked.
//  - Coaching must be SPECIFIC: 2–3 weakest areas only, every sentence tied to
//    this take's numbers (and timestamps where we have them), each with a
//    concrete drill. Plain and factual — never motivational-poster copy.
//
// Report shape:
//   { overallScore, breakdown[], coaching[], categoryScores, feedback, tips,
//     highlights, meta }
// `breakdown`/`coaching` drive the current UI; categoryScores/feedback/tips are
// kept so sessions saved by OLDER builds still render via the legacy tab paths.

const clamp = (n) => Math.max(1, Math.min(10, Math.round(n)));
const clamp01 = (n) => Math.max(0, Math.min(1, n));
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
const stddev = (arr) => {
  if (arr.length < 2) return 0;
  const m = avg(arr);
  return Math.sqrt(avg(arr.map((x) => (x - m) ** 2)));
};
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// What counts as enough speech to fairly judge.
const MIN_WORDS = 25; // below this we won't pretend to grade
const MIN_SECONDS = 12;
const FULL_WORDS = 80; // earns full "sample sufficiency"
const FULL_SECONDS = 45;

// Densest run of filler moments within a 20s window (≥3 events) → where it was.
function fillerCluster(events) {
  if (!events || events.length < 3) return null;
  let best = null;
  for (let i = 0; i < events.length; i++) {
    let j = i;
    while (j + 1 < events.length && events[j + 1].at - events[i].at <= 20) j++;
    const n = j - i + 1;
    if (n >= 3 && (!best || n > best.n)) {
      best = { n, at: events[i].at + (events[j].at - events[i].at) / 2 };
    }
  }
  return best;
}

export function generateLocalFeedback({
  transcript = '',
  fillerWordCounts = {},
  fillerEvents = [],
  avgWpm = 0,
  wpmData = [],
  pauses = [],
  volumeStdDev = 0,
  duration = 0,
  words = [],
  eyeContact = null,
}) {
  // ---- Derived metrics --------------------------------------------------
  const wordCount = words.length || (transcript.trim() ? transcript.trim().split(/\s+/).length : 0);
  const fillerTotal = Object.values(fillerWordCounts).reduce((a, b) => a + b, 0);
  const fillerPct = wordCount ? (fillerTotal / wordCount) * 100 : 0;
  const minutes = Math.max(duration / 60, 0.01);
  const fillersPerMin = fillerTotal / minutes;
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
  const pauseRate = pauses.length / minutes;
  const longestPause = pauses.length ? pauses.reduce((a, b) => (b.duration > a.duration ? b : a)) : null;

  // Articulation signal: recognizer confidence per word (0–1), where available.
  const confVals = words.map((w) => w.confidence).filter((c) => typeof c === 'number' && c > 0);
  const hasConf = confVals.length > 0;
  const avgConf = hasConf ? avg(confVals) : null;
  const lowConfCount = words.filter((w) => typeof w.confidence === 'number' && w.confidence > 0 && w.confidence < 0.6).length;

  const hasEye = eyeContact && typeof eyeContact.contactPct === 'number' && eyeContact.trackedSeconds >= 5;

  // How much we trust this as a real sample (0–1).
  const sufficiency = clamp01(Math.min(wordCount / FULL_WORDS, duration / FULL_SECONDS));

  // ---- Gate: not enough speech to grade --------------------------------
  if (wordCount < MIN_WORDS || duration < MIN_SECONDS) {
    const overall = wordCount < 8 ? 1 : 2;
    const tooFew = `${wordCount} word${wordCount === 1 ? '' : 's'} in ${Math.round(duration)}s`;
    return {
      overallScore: overall,
      breakdown: [],
      coaching: [
        {
          title: 'Record a longer take first',
          body: `${tooFew} isn't enough to measure anything honestly — pace, fillers, and flow all need sustained speech.`,
          drill: 'Pick a topic you know, speak 45–60 seconds in full sentences: one opening line, one point, one closing line.',
        },
      ],
      categoryScores: { clarity: overall, structure: overall, vocabulary: overall, confidence: overall },
      feedback: {
        clarity: `${tooFew} is too short to analyze. Record at least 30–45 seconds.`,
        structure: `Not enough to assess structure. Speak a few connected sentences.`,
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

  // ---- Transparent metric scores (1–10 each, capped by sample size) -----
  const cap = 3 + 7 * sufficiency;
  const capped = (n) => clamp(Math.min(n, cap));
  const metrics = [];

  // Pace — 120–160 WPM is the range audiences process comfortably.
  if (avgWpm > 0) {
    const dist = avgWpm < 120 ? 120 - avgWpm : avgWpm > 160 ? avgWpm - 160 : 0;
    metrics.push({
      id: 'pace',
      label: 'Pacing',
      score: capped(10 - dist / 6),
      valueDisplay: `${Math.round(avgWpm)} WPM`,
      targetDisplay: '120–160 WPM',
      inRange: dist === 0,
      sentence:
        dist === 0
          ? `Listeners follow spoken ideas best at 120–160 words per minute — your ${Math.round(avgWpm)} WPM sits right in that range.`
          : avgWpm > 160
            ? `Listeners need 120–160 words per minute to absorb ideas; at ${Math.round(avgWpm)} WPM your points crowd each other.`
            : `120–160 words per minute keeps energy up; at ${Math.round(avgWpm)} WPM the talk drags between ideas.`,
    });
  }

  // Fillers — measured from Whisper + live-captured hesitations.
  {
    const p = fillerPct;
    const score = p <= 1 ? 10 : p <= 2 ? 9 : p <= 3 ? 8 : p <= 4.5 ? 6.5 : p <= 6 ? 5.5 : p <= 8 ? 4 : p <= 10 ? 3 : 2;
    metrics.push({
      id: 'fillers',
      label: 'Filler words',
      score: capped(score),
      valueDisplay: `${fillerTotal} (${fillerPct.toFixed(1)}% of words, ${fillersPerMin.toFixed(1)}/min)`,
      targetDisplay: 'under 3% of words',
      inRange: p <= 3,
      sentence:
        fillerTotal === 0
          ? `No fillers detected — every word carried content.`
          : `Fillers pull attention off the message. ${fillerTotal} of your ${wordCount} words were fillers${topFiller ? ` ("${topFiller}" most often)` : ''} — ${p <= 3 ? 'within' : 'above'} the 3% line where listeners start noticing.`,
    });
  }

  // Flow — long (≥2s) unplanned silences per minute, plus pace steadiness.
  {
    let score = pauseRate <= 1 ? 9 : pauseRate <= 2 ? 8 : pauseRate <= 3 ? 6.5 : pauseRate <= 4 ? 5 : 4;
    if (paceValues.length > 2 && paceSwing > 40) score -= 1;
    metrics.push({
      id: 'flow',
      label: 'Flow & pauses',
      score: capped(score),
      valueDisplay: `${pauses.length} long pause${pauses.length === 1 ? '' : 's'} (${pauseRate.toFixed(1)}/min)`,
      targetDisplay: '≤2 per minute',
      inRange: pauseRate <= 2,
      sentence:
        pauses.length === 0
          ? `No stalls of 2+ seconds — the thread never dropped.`
          : `A pause over 2 seconds reads as a lost thread unless it's deliberate. You had ${pauses.length}${longestPause ? `, the longest ${longestPause.duration.toFixed(1)}s around ${fmtTime(longestPause.at)}` : ''}.`,
    });
  }

  // Vocabulary — needs a real word count before variety means anything.
  if (tokens.length >= 30) {
    let score = ttr > 0.62 ? 8 : ttr > 0.52 ? 7 : ttr > 0.42 ? 6 : ttr > 0.35 ? 5 : 4;
    if (longWordPct > 18) score += 1;
    metrics.push({
      id: 'vocabulary',
      label: 'Vocabulary',
      score: capped(score),
      valueDisplay: `${Math.round(ttr * 100)}% unique words`,
      targetDisplay: '50%+ unique',
      inRange: ttr >= 0.5,
      sentence:
        ttr >= 0.5
          ? `Varied wording keeps listeners engaged — ${Math.round(ttr * 100)}% of your words were unique.`
          : `Repeated wording dulls a talk. Only ${Math.round(ttr * 100)}% of your words were unique — the same few carried most sentences.`,
    });
  }

  // Articulation — only when the recognizer supplied real confidence values.
  if (hasConf) {
    metrics.push({
      id: 'articulation',
      label: 'Articulation',
      score: capped(avgConf * 10 - (lowConfCount >= 3 ? 1 : 0)),
      valueDisplay: `${Math.round(avgConf * 100)}% recognition confidence`,
      targetDisplay: '85%+',
      inRange: avgConf >= 0.85,
      sentence:
        lowConfCount > 0
          ? `If speech software struggles, back-row listeners do too: ${lowConfCount} word${lowConfCount === 1 ? '' : 's'} were hard to make out.`
          : `Clean articulation — the recognizer caught ${Math.round(avgConf * 100)}% of words confidently.`,
    });
  }

  // Eye contact — only when a camera take actually tracked enough.
  if (hasEye) {
    const p = eyeContact.contactPct;
    const score = p >= 80 ? 10 : p >= 70 ? 9 : p >= 60 ? 8 : p >= 50 ? 6.5 : p >= 35 ? 5 : p >= 20 ? 3.5 : 2.5;
    metrics.push({
      id: 'eyeContact',
      label: 'Eye contact',
      score: capped(score),
      valueDisplay: `${p}% of the talk (longest hold ${Math.round(eyeContact.longestStreakSeconds)}s)`,
      targetDisplay: '60%+ at the camera',
      inRange: p >= 60,
      sentence:
        p >= 60
          ? `Audiences trust speakers who look at them — you faced the camera ${p}% of the talk.`
          : `Audiences trust speakers who look at them; at ${p}% of the talk, your eyes were elsewhere more than on them.`,
    });
  }

  // ---- Overall = plain average of measured metrics, capped by sample ----
  const overallScore = clamp(Math.min(avg(metrics.map((m) => m.score)), cap));
  const share = metrics.length ? 10 / metrics.length : 0;
  const breakdown = metrics.map((m) => ({
    ...m,
    // Truthful contribution: overall(≈) = Σ score/N. "Contributes X of 10."
    points: Math.round((m.score / metrics.length) * 10) / 10,
    maxPoints: Math.round(share * 10) / 10,
  }));

  // ---- Coaching: the 2–3 weakest areas, real numbers, concrete drills ---
  const cluster = fillerCluster(fillerEvents);
  const drills = {
    fillers: {
      title: `Cut the fillers — ${fillerTotal} in ${fmtTime(duration)}`,
      body: `${fillerPct.toFixed(1)}% of your words were fillers${topFiller ? `, led by "${topFiller}"` : ''}${cluster ? `. Your densest cluster was around ${fmtTime(cluster.at)} — that's usually where you're deciding what to say next while talking` : ''}. The fix isn't speed, it's silence: a pause does the same job and sounds deliberate.`,
      drill: `Do one 30-second take where the ONLY goal is zero fillers — when you feel one coming, stop, breathe once, continue. Score doesn't matter; the pause reflex does.`,
    },
    pace: avgWpm > 160
      ? {
          title: `Slow down — ${Math.round(avgWpm)} WPM`,
          body: `You're ${Math.round(avgWpm - 160)} WPM over the comfortable ceiling. At this speed your emphasis flattens — every sentence gets the same weight, so nothing lands as important.`,
          drill: `Re-record the same talk with a hard rule: a full one-second stop after each key point. It will feel slow; it won't sound slow.`,
        }
      : {
          title: `Add pace — ${Math.round(avgWpm)} WPM`,
          body: `You're ${Math.round(120 - avgWpm)} WPM under the range where a talk feels energetic. Slow overall pace usually means the words aren't decided yet, not that you're deliberate.`,
          drill: `Outline three bullet points, then record 30 seconds aiming to land all three — momentum comes from knowing what's next.`,
        },
    flow: {
      title: `Tighten the flow — ${pauses.length} long pause${pauses.length === 1 ? '' : 's'}`,
      body: longestPause
        ? `Your longest stall was ${longestPause.duration.toFixed(1)}s around ${fmtTime(longestPause.at)}, right after "${longestPause.before}". Stalls cluster where the next idea isn't loaded yet.`
        : `Pauses came ${pauseRate.toFixed(1)} times per minute — more than listeners read as intentional.`,
      drill: `Rehearse only your transitions: say the last line of one point and the first line of the next, five times, until the handoff is automatic.`,
    },
    vocabulary: {
      title: `Vary the wording — ${Math.round(ttr * 100)}% unique`,
      body: `A few words are carrying most of your sentences. Listeners tune out phrasing they've already heard, even when the idea is new.`,
      drill: `Find your two most-repeated content words in the transcript tab and write three alternatives for each, then re-record using them.`,
    },
    articulation: {
      title: `Sharpen articulation — ${lowConfCount} unclear word${lowConfCount === 1 ? '' : 's'}`,
      body: `Words are blurring at the edges — if recognition software misses them, people in the back do too.`,
      drill: `Read one paragraph aloud hitting every word-ending consonant harder than feels natural. Record it; it will sound normal, not exaggerated.`,
    },
    eyeContact: {
      title: `Hold the camera's gaze — ${hasEye ? eyeContact.contactPct : 0}%`,
      body: hasEye
        ? `Your longest hold was ${Math.round(eyeContact.longestStreakSeconds)}s. Looking away while thinking is natural — but to an audience it reads as uncertainty about your own point.`
        : '',
      drill: `Record 30 seconds where the only goal is staying on the lens — tape a dot next to the camera if it helps. Content doesn't matter for this rep.`,
    },
  };

  let coaching = metrics
    .filter((m) => m.score < 8 && drills[m.id])
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((m) => drills[m.id]);

  if (coaching.length === 0) {
    coaching = [
      {
        title: 'Strong take — raise the bar',
        body: `Every measured area landed in range: ${metrics.map((m) => `${m.label.toLowerCase()} ${m.valueDisplay}`).join(', ')}. The next gain is consistency, not correction.`,
        drill: `Record the same talk twice back-to-back and compare scores — a strong take you can repeat is worth more than a lucky one.`,
      },
    ];
  }

  // ---- Highlights — only genuine, earned strengths ---------------------
  const canPraise = sufficiency >= 0.5;
  const highlights = canPraise
    ? metrics.filter((m) => m.inRange && m.score >= 8).slice(0, 2).map((m) => `${m.label}: ${m.valueDisplay} — on target.`)
    : [];

  // ---- Legacy fields so older saved reports keep rendering --------------
  const categoryScores = Object.fromEntries(metrics.map((m) => [m.id, m.score]));
  const feedback = Object.fromEntries(metrics.map((m) => [m.id, m.sentence]));
  const tips = coaching.map((c) => c.drill).slice(0, 3);

  return {
    overallScore,
    breakdown,
    coaching,
    categoryScores,
    feedback,
    tips,
    highlights,
    meta: {
      insufficient: false,
      sufficiency: Math.round(sufficiency * 100) / 100,
      cap: Math.round(cap * 10) / 10,
      avgConfidence: avgConf,
      lowConfCount,
      fillersPerMin: Math.round(fillersPerMin * 10) / 10,
    },
  };
}
