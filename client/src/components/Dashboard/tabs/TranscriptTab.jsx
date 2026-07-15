import { Fragment } from 'react';
import { markFillerWords } from '../../../utils/fillerWords.js';

export default function TranscriptTab({ results }) {
  const { transcript, fillerWordCounts } = results;
  // Show the honest transcript: real words plus the "um"/"uh" Whisper dropped but
  // we detected (results.displayWords). Highlights and the count come from the
  // SAME list + the shared total, so this always matches the other filler views.
  const words = results.displayWords || results.words;
  const hasWordData = words && words.length > 0;
  const marked = hasWordData ? markFillerWords(words) : new Set();
  const totalFillers = Object.values(fillerWordCounts || {}).reduce((a, b) => a + b, 0);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <h3 className="font-semibold text-ink/80">Transcript</h3>
        {hasWordData && (
          <div className="flex items-center gap-2 text-xs text-ink/45">
            <span className="inline-block w-3 h-3 rounded bg-amber-200 border border-amber-300" />
            {totalFillers} filler{totalFillers === 1 ? '' : 's'} highlighted
          </div>
        )}
      </div>

      <div className="leading-loose text-ink/75 text-[15px]">
        {hasWordData ? (
          <p>
            {words.map((w, i) => {
              const filler = marked.has(i);
              // "heard" words were detected acoustically, not transcribed by Whisper.
              const heard = w.heard;
              return (
                <Fragment key={i}>
                  <span
                    className={
                      filler
                        ? `rounded px-1 text-amber-900 bg-amber-100 border ${
                            heard ? 'border-dashed border-amber-400' : 'border-amber-300/70'
                          }`
                        : undefined
                    }
                    title={
                      filler
                        ? heard
                          ? `Heard in your audio at ${w.start?.toFixed(1)}s (the transcriber skipped it)`
                          : `Filler at ${w.start?.toFixed(1)}s`
                        : undefined
                    }
                  >
                    {w.word}
                  </span>{' '}
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
          Words with a dashed outline were heard in your audio but skipped by the speech model —
          fillers like "um" and "uh" especially. They still count toward your totals.
        </p>
      )}
    </div>
  );
}
