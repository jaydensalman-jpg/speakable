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
    <section className="sheet">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <p className="eyebrow">Transcript</p>
        {hasWordData && (
          <div className="flex items-center gap-2 text-[13px] text-ink/45 tabular-nums">
            <span className="inline-block h-2 w-6 border-b-2 border-brand-500" />
            {shownFillers} filler word{shownFillers === 1 ? '' : 's'}
            {unlocated > 0 && <span className="text-ink/35">· +{unlocated} detected in audio</span>}
          </div>
        )}
      </div>

      <div className="max-w-[47rem] text-[17px] leading-[1.75] text-ink/85 sm:text-[18px]">
        {hasWordData ? (
          <p>
            {words.map((w, i) => {
              const filler = marked.has(i);
              const active = interactive && now >= (w.start ?? -1) && now < (w.end ?? -1);
              // Highlighted words get a snug rounded background; the -mx offsets
              // the padding so highlights never push neighbouring words apart.
              const highlight = active
                ? 'bg-brand-500 text-onchip rounded px-1 -mx-0.5'
                : filler
                  ? 'filler-mark bg-brand-100 border-b-2 border-brand-500 px-0.5 -mx-0.5'
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
        <p className="caption mt-5 border-t border-sand pt-5">
          {unlocated > 0
            ? `This take was recorded before we started placing detected fillers in the transcript, so ${unlocated} "um"/"uh" heard in your audio can't be shown here. Record a new take to see every one highlighted.`
            : interactive
              ? 'Tap any word to jump the audio to that moment. Filler words are marked in coral.'
              : 'Filler words are marked in coral.'}
        </p>
      )}
    </section>
  );
}
