import { useRef } from 'react';
import Transcript from '../Transcript.jsx';

// Watch & Listen — restyled Oct 2026 from the Figma Make redesign: cardless,
// open sections on cream. BEHAVIOUR IS UNCHANGED on purpose. The video stays
// muted with a separate <audio> on the same source, and `audioRef` is still the
// element the transcript seeks and follows. The Figma's "Video only / Audio
// only / Video + audio" selector was deliberately not built — this tab was
// restyled, not rewired.
export default function SelfReviewTab({ results }) {
  const { mediaUrl, mediaType } = results;
  const hasVideo = mediaType === 'video' && mediaUrl;
  const audioRef = useRef(null); // shared so the transcript can seek/follow the audio

  // Even with no playable media (cloud-only takes), still show the transcript so
  // you can read what you said.
  if (!mediaUrl) {
    return (
      <div className="animate-rise">
        <section className="sheet">
          <p className="eyebrow">Your recording</p>
          <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-ink/55">
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
        <p className="caption mt-3">See it. Hear it. Put it together.</p>

        <div className={`mt-7 grid gap-8 ${hasVideo ? 'lg:grid-cols-2' : ''}`}>
          {hasVideo && (
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <p className="eyebrow">Video</p>
                <span className="text-[13px] text-ink/40">No audio</span>
              </div>
              <video
                src={mediaUrl}
                muted
                controls
                playsInline
                className="mt-4 w-full rounded-2xl bg-ink object-cover aspect-video"
              />
            </div>
          )}

          <div>
            <div className="flex items-baseline justify-between gap-3">
              <p className="eyebrow">Audio</p>
              <span className="text-[13px] text-ink/40">{hasVideo ? 'Audio only' : 'Listen'}</span>
            </div>
            <div className="mt-4 flex items-center rounded-2xl border border-sand bg-white/50 px-5 py-6">
              <audio ref={audioRef} src={mediaUrl} controls className="w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Transcript sits beneath the players so you can listen and read together.
          Passing the audio ref makes each word clickable (jump to that moment)
          and highlights the word under the playhead as it plays. */}
      <Transcript results={results} mediaRef={audioRef} />
    </div>
  );
}
