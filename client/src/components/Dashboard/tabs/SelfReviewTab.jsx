import { useEffect, useRef, useState } from 'react';
import Transcript from '../Transcript.jsx';

// Watch & Listen — rebuilt Oct 2026 from the Figma redesign, including the
// playback-format selector (`.playback-mode` / `.mode-options` / `.media-object`).
//
// The Figma is a static mock: its three modes are plain divs with no media
// behind them. Here they drive real playback off the one recorded blob —
// "video only" is the muted video, "video + audio" is the same element unmuted,
// and "audio only" is an <audio>. Native controls are kept rather than
// reproducing the mock's custom transport, so scrubbing, keyboard access and
// mobile behaviour all keep working.
//
// Two things the mock doesn't have to handle:
//  - switching mode remounts the element, so the playhead is carried across
//    (otherwise every switch would silently restart the take)
//  - the transcript seeks whichever element is currently mounted, via one ref
const MODES = [
  { id: 'video', label: 'Video only' },
  { id: 'audio', label: 'Audio only' },
  { id: 'both', label: 'Video + audio' },
];

export default function SelfReviewTab({ results }) {
  const { mediaUrl, mediaType } = results;
  const hasVideo = mediaType === 'video' && mediaUrl;

  // Audio-only takes have nothing to choose between, so the selector is hidden.
  const [mode, setMode] = useState(hasVideo ? 'both' : 'audio');
  const mediaRef = useRef(null);
  const lastTime = useRef(0);

  // Carry the playhead across a mode switch.
  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;
    if (lastTime.current > 0) {
      try { el.currentTime = lastTime.current; } catch { /* not seekable yet */ }
    }
    const remember = () => { lastTime.current = el.currentTime; };
    el.addEventListener('timeupdate', remember);
    return () => el.removeEventListener('timeupdate', remember);
  }, [mode]);

  if (!mediaUrl) {
    return (
      <div className="animate-rise">
        <section className="sheet">
          <p className="eyebrow">Your recording</p>
          <p className="body-copy mt-3 max-w-prose">
            {results.cloudOnly
              ? 'The recording stays on the device where it was made. Only this report synced to your account.'
              : 'This recording isn’t available to play back. Record again to use the self-review.'}
          </p>
        </section>
        <Transcript results={results} />
      </div>
    );
  }

  return (
    <div className="animate-rise">
      <section className="sheet">
        <p className="eyebrow">Your recording</p>
        <h2 className="mt-3 font-display text-[2.125rem] leading-[1.08] tracking-[-0.025em] text-ink md:text-[2.5rem]">
          Watch it back.
        </h2>
        <p className="body-copy mt-3">See it. Hear it. Put it together.</p>

        {hasVideo && (
          <div className="mt-7 flex flex-col items-stretch justify-between gap-4 rounded-2xl border border-sand bg-surface p-4 md:flex-row md:items-center md:gap-6">
            <div>
              <p className="eyebrow">Playback format</p>
              <p className="caption mt-1">Choose what you want to review.</p>
            </div>
            <div
              role="radiogroup"
              aria-label="Playback format"
              className="grid grid-cols-3 gap-1 rounded-full border border-sand bg-cream p-1"
            >
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={mode === m.id}
                  onClick={() => setMode(m.id)}
                  className={`whitespace-nowrap rounded-full px-2 py-2.5 text-center text-[0.72rem] font-medium leading-none transition-colors duration-250 sm:px-4 sm:text-[0.8125rem] ${
                    mode === m.id
                      ? 'bg-brand-500 text-white shadow-soft'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* .media-object */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-sand bg-surface">
          {mode === 'audio' ? (
            <div className="grid place-items-center gap-5 bg-cream px-6 py-10">
              <p className="eyebrow">Your audio</p>
              <audio ref={mediaRef} src={mediaUrl} controls className="w-full max-w-xl" />
            </div>
          ) : (
            <>
              <video
                ref={mediaRef}
                src={mediaUrl}
                muted={mode === 'video'}
                controls
                playsInline
                className="aspect-video w-full bg-ink object-cover"
              />
              {mode === 'video' && (
                <p className="grid min-h-[3.5rem] place-items-center px-4 text-center text-[0.8125rem] text-muted">
                  Video-only playback · Select Video + audio to hear the recording
                </p>
              )}
            </>
          )}
        </div>
      </section>

      {/* Transcript follows whichever element is mounted, so click-to-seek keeps
          working in every mode rather than only against the audio player. */}
      <Transcript results={results} mediaRef={mediaRef} />
    </div>
  );
}
