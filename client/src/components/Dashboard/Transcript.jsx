import { Fragment } from 'react';
import { markFillerWords, detectFillerWords } from '../../utils/fillerWords.js';

// Reusable transcript block. Lives inside the Watch & Listen tab (beneath the
// players) so you can read along while the audio plays. Shows the honest
// transcript: real words plus the "um"/"uh" Whisper dropped but we detected
// (results.displayWords), with fillers highlighted. The count matches the other
// filler views; older takes without saved positions get an honest "+N detected".
export default function Transcript({ results }) {
  const { transcript, fillerWordCounts } = results;
  const words = results.displayWords || results.words;
  const hasWordData = words && words.length > 0;
  const marked = hasWordData ? markFillerWords(words) : new Set();
  const shownFillers = hasWordData
    ? Object.values(detectFillerWords(words)).reduce((a, b) => a + b, 0)
    : 0;
  const storedTotal = Object.values(fillerWordCounts || {}).reduce((a, b) => a + b, 0);
  const unlocated = Math.max(0, storedTotal - shownFillers);

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

      <div className="leading-loose text-ink/75 text-[15px]">
        {hasWordData ? (
          <p>
            {words.map((w, i) => {
              const filler = marked.has(i);
              const heard = w.heard; // detected acoustically, not transcribed by Whisper
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
          {unlocated > 0
            ? `This take was recorded before we started placing detected fillers in the transcript, so ${unlocated} "um"/"uh" heard in your audio can't be shown here. Record a new take to see every one highlighted.`
            : 'Words with a dashed outline were heard in your audio but skipped by the speech model, fillers like "um" and "uh" especially. They still count toward your totals.'}
        </p>
      )}
    </div>
  );
}
