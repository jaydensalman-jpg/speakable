const PAUSE_THRESHOLD_SECONDS = 2;

export function detectPauses(words) {
  if (!words || words.length < 2) return [];

  const pauses = [];
  for (let i = 1; i < words.length; i++) {
    const gap = words[i].start - words[i - 1].end;
    if (gap >= PAUSE_THRESHOLD_SECONDS) {
      pauses.push({
        at: words[i - 1].end,
        duration: parseFloat(gap.toFixed(2)),
        before: words[i - 1].word,
        after: words[i].word,
      });
    }
  }
  return pauses;
}
