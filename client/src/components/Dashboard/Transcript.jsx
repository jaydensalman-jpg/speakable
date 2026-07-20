import { Fragment, useEffect, useState } from 'react';
import { markFillerWords, detectFillerWords } from '../../utils/fillerWords.js';

// Reusable transcript block, shown inside Watch & Listen beneath the players so
// you read along while the audio plays. Every word is exactly what Whisper
// transcribed (no acoustic guessing). When a media element is passed, words are
// clickable — click one and the audio jumps to that moment — and the word under
// the playhead is highlighted as it plays.
export default function Transcript({ results, mediaRef }) {
  const { transcript, fillerWordCounts } = results;
  const words = results.displayWords || results.words;
  const hasWordData = words && words.length > 0;
  const marked = hasWordData ? markFillerWords(words) : new Set();
  const shownFillers = hasWordData
    ? Object.values(detectFillerWords(words)).reduce((a, b) => a + b, 0)
    : 0;
  const storedTotal = Object.values(fillerWordCounts || {}).reduce((a, b) => a + b, 0);
  const unlocated = Math.max(0, storedTotal - shownFillers);
  const interactive = !!mediaRef;

  // Follow-along: track the media's current time and highlight the active word.
  const [now, setNow] = useState(-1);
  useEffect(() => {
    const el = mediaRef?.current;
    if (!el) return;
    const onTime = () => setNow(el.currentTime);
    const onEnd = () => setNow(-1);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('ended', onEnd);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('ended', onEnd);
    };
  }, [mediaRef, results]);

  const seekTo = (start) => {
    const el = mediaRef?.current;
    if (!el || start == null) return;
    el.currentTime = Math.max(0, start);
    el.play?.().catch(() => {});
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <h3 className="font-semibold text-ink/80">Transcript</h3>
        {hasWordData && (
          <div className="flex items-center gap-2 text-xs text-ink/45">
            <span className="inline-block w-3 h-3 rounded bg-amber-200 border border-amber-300" />
            {shownFillers} filler{shownFillers === 1 ? '' : 's'} highlighted
            {unlocated > 0 && <span className="text-ink/35">· +{unlocated} detected in audio</span>}
          </div>
        )}
      </div>

      <div className="leading-relaxed text-ink/80 text-[15px]">
        {hasWordData ? (
          <p>
            {words.map((w, i) => {
              const filler = marked.has(i);
              const active = interactive && now >= (w.start ?? -1) && now < (w.end ?? -1);
              // Highlighted words get a snug rounded background; the -mx offsets
              // the padding so highlights never push neighbouring words apart.
              const highlight = active
                ? 'bg-brand-500 text-white rounded px-1 -mx-0.5'
                : filler
                  ? 'bg-amber-100 text-amber-900 rounded px-1 -mx-0.5'
                  : '';
              const cls = [
                interactive ? 'cursor-pointer transition-colors rounded hover:bg-brand-100 hover:text-ink' : '',
                highlight,
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <Fragment key={i}>
                  {interactive ? (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={() => seekTo(w.start)}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && seekTo(w.start)}
                      className={cls || undefined}
                      title={w.start != null ? `Jump to ${w.start.toFixed(1)}s` : undefined}
                    >
                      {w.word}
                    </span>
                  ) : (
                    <span className={cls || undefined}>{w.word}</span>
                  )}{' '}
                </Fragment>
              );
            })}
          </p>
        ) : transcript ? (
          <p className="whitespace-pre-wrap">{transcript}</p>
        ) : (
          <p className="text-ink/40 italic">No transcript available.</p>
        )}
      </div>

      {hasWordData && (
        <p className="text-xs text-ink/45 mt-4 pt-4 border-t border-sand">
          {unlocated > 0
            ? `This take was recorded before we started placing detected fillers in the transcript, so ${unlocated} "um"/"uh" heard in your audio can't be shown here. Record a new take to see every one highlighted.`
            : interactive
              ? 'Tap any word to jump the audio to that moment. Filler words are highlighted in amber.'
              : 'Filler words are highlighted in amber.'}
        </p>
      )}
    </div>
  );
}
