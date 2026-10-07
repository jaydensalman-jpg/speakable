import { useEffect, useRef, useState } from 'react';
import Transcript from '../Transcript.jsx';
import WaveformPlayer from '../../ui/waveform-player.jsx';

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
          /* .playback-mode — stacks and stretches below 48rem, exactly as the
             design does; the pill row then becomes three equal columns. */
          <div className="mt-7 flex flex-col items-stretch gap-6 rounded-2xl border border-sand bg-surface p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="eyebrow">Playback format</p>
              <p className="caption mt-1">Choose what you want to review.</p>
            </div>
            <div
              role="radiogroup"
              aria-label="Playback format"
              className="grid grid-cols-3 gap-[0.15rem] rounded-full border border-sand bg-cream p-[0.2rem] md:grid-cols-[repeat(3,auto)] md:gap-1 md:p-1"
            >
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={mode === m.id}
                  onClick={() => setMode(m.id)}
                  className={`whitespace-nowrap rounded-full px-[0.3rem] py-[0.45rem] text-center text-[0.72rem] font-medium leading-none transition-colors duration-[180ms] md:px-4 md:py-2.5 md:text-[0.8125rem] md:leading-normal ${
                    mode === m.id
                      ? 'bg-brand-500 text-white shadow-[0_0.2rem_0.6rem_rgba(200,98,66,0.24)]'
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
        <div className="mt-4">
          {mode === 'audio' ? (
            <WaveformPlayer
              key="audio"
              src={mediaUrl}
              mediaRef={mediaRef}
              duration={results.duration || 0}
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-sand bg-surface">
              <video
                ref={mediaRef}
                src={mediaUrl}
                muted={mode === 'video'}
                controls
                playsInline
                className="aspect-[4/3] w-full bg-[#302e2a] object-cover md:aspect-[16/8.9]"
              />
              {mode === 'video' && (
                <p className="grid min-h-[3.5rem] place-items-center px-4 text-center text-[0.8125rem] text-muted">
                  Video-only playback · Select Video + audio to hear the recording
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Transcript follows whichever element is mounted, so click-to-seek keeps
          working in every mode rather than only against the audio player. */}
      <Transcript results={results} mediaRef={mediaRef} />
    </div>
  );
}
