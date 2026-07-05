const WINDOW_SECONDS = 10;

export function computePacing(words, durationOverride) {
  if (!words || words.length === 0) return { avgWpm: 0, wpmData: [] };

  // Prefer the true clip length (from the decoded audio); fall back to last word's end.
  const duration = durationOverride && durationOverride > 0 ? durationOverride : (words.at(-1)?.end ?? 0);
  if (duration === 0) {
    const avgWpm = Math.round((words.length / 1) * 60);
    return { avgWpm, wpmData: [{ time: 0, wpm: avgWpm }] };
  }

  const avgWpm = Math.round((words.length / duration) * 60);

  const buckets = {};
  for (const { start } of words) {
    const bucket = Math.floor(start / WINDOW_SECONDS) * WINDOW_SECONDS;
    buckets[bucket] = (buckets[bucket] || 0) + 1;
  }

  const wpmData = Object.entries(buckets)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([sec, count]) => ({
      time: Number(sec),
      label: formatTime(Number(sec)),
      wpm: Math.round((count / WINDOW_SECONDS) * 60),
    }));

  return { avgWpm, wpmData };
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m${s}s` : `${s}s`;
}
