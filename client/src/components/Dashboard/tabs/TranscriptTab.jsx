import { Fragment } from 'react';
import { isFillerWord } from '../../../utils/fillerWords.js';

export default function TranscriptTab({ results }) {
  const { words, transcript } = results;
  const hasWordData = words && words.length > 0;
  const fillerCount = hasWordData ? words.filter((w) => isFillerWord(w.word)).length : 0;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <h3 className="font-semibold text-ink/80">Transcript</h3>
        {hasWordData && (
          <div className="flex items-center gap-2 text-xs text-ink/45">
            <span className="inline-block w-3 h-3 rounded bg-amber-200 border border-amber-300" />
            {fillerCount} filler{fillerCount === 1 ? '' : 's'} highlighted
          </div>
        )}
      </div>

      <div className="leading-loose text-ink/75 text-[15px]">
        {hasWordData ? (
          <p>
            {words.map((w, i) => {
              const filler = isFillerWord(w.word);
              return (
                <Fragment key={i}>
                  <span
                    className={
                      filler
                        ? 'bg-amber-100 border border-amber-300/70 rounded px-1 text-amber-900'
                        : undefined
                    }
                    title={filler ? `Filler at ${w.start?.toFixed(1)}s` : undefined}
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
          This is exactly what was transcribed from your audio. If a word you said is missing here,
          the speech model didn’t catch it — fillers especially can be hard to transcribe.
        </p>
      )}
    </div>
  );
}
