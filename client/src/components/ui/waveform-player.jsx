import { useEffect, useRef, useState } from 'react';

// Audio-only playback, built from the Figma's `.media-object` audio state:
// centred eyebrow, a coral waveform, the take's length, then a transport row
// (play, elapsed, scrub, total, mute).
//
// The mock's waveform is decorative. This one is decoded from the real
// recording — fetch the blob, decodeAudioData, then take the peak of each
// bucket — because a waveform that doesn't match the audio under it is a lie
// about the user's own take. If decoding fails (Safari refuses some webm), the
// bars are dropped and the transport alone is shown rather than drawing
// something invented.
const BAR_COUNT = 44;
const MIN_BAR = 0.12; // silence still needs a visible tick

export default function WaveformPlayer({ src, mediaRef, duration = 0 }) {
  const [peaks, setPeaks] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [len, setLen] = useState(duration);
  const ctxRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        const buf = await (await fetch(src)).arrayBuffer();
        const ctx = (ctxRef.current ||= new AC());
        const audio = await ctx.decodeAudioData(buf);
        if (cancelled) return;
        const data = audio.getChannelData(0);
        const size = Math.floor(data.length / BAR_COUNT) || 1;
        const out = [];
        for (let i = 0; i < BAR_COUNT; i++) {
          let peak = 0;
          const start = i * size;
          for (let j = start; j < start + size && j < data.length; j++) {
            const v = Math.abs(data[j]);
            if (v > peak) peak = v;
          }
          out.push(peak);
        }
        const max = Math.max(...out) || 1;
        setPeaks(out.map((p) => Math.max(p / max, MIN_BAR)));
      } catch {
        // Undecodable container — show the transport without bars.
      }
    })();
    return () => {
      cancelled = true;
      ctxRef.current?.close?.();
      ctxRef.current = null;
    };
  }, [src]);

  // The transcript seeks this same element directly, so state is driven off the
  // element's own events rather than from the click handlers below.
  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return undefined;
    const onTime = () => setTime(el.currentTime);
    const onMeta = () => { if (Number.isFinite(el.duration)) setLen(el.duration); };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('durationchange', onMeta);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('ended', onPause);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('durationchange', onMeta);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('ended', onPause);
    };
  }, [mediaRef]);

  const toggle = () => {
    const el = mediaRef.current;
    if (!el) return;
    if (el.paused) el.play(); else el.pause();
  };

  const seek = (e) => {
    const el = mediaRef.current;
    const to = Number(e.target.value);
    setTime(to);
    if (el) el.currentTime = to;
  };

  const toggleMute = () => {
    const el = mediaRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  };

  const pct = len > 0 ? (time / len) * 100 : 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-sand bg-surface">
      <audio ref={mediaRef} src={src} preload="metadata" className="hidden" />

      <div className="grid place-items-center gap-7 bg-cream px-6 py-12">
        <p className="eyebrow">Your audio</p>

        {peaks && (
          /* Bars flex to fill the row rather than taking a fixed width, so the
             same 44 buckets fit a phone without overflowing the card. */
          <div className="flex h-32 w-full max-w-3xl items-center gap-[2px] sm:gap-[0.4rem]" aria-hidden>
            {peaks.map((p, i) => (
              <span
                key={i}
                className="min-w-[2px] max-w-1 flex-1 rounded-full bg-brand-500"
                style={{ height: `${p * 100}%` }}
              />
            ))}
          </div>
        )}

        <p className="caption">{fmt(len)} recording</p>
      </div>

      <div className="flex items-center gap-4 border-t border-sand px-5 py-4">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'Pause' : 'Play'}
          className="shrink-0 rounded-full p-1 text-ink transition-colors hover:text-brand-500"
        >
          {playing ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden>
              <rect x="3" y="2" width="4" height="14" rx="1" />
              <rect x="11" y="2" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden>
              <path d="M4 2.5 15 9 4 15.5Z" />
            </svg>
          )}
        </button>

        <span className="w-10 shrink-0 text-[0.8125rem] tabular-nums text-muted">{fmt(time)}</span>

        <input
          type="range"
          min="0"
          max={len || 0}
          step="0.01"
          value={Math.min(time, len || 0)}
          onChange={seek}
          aria-label="Seek"
          className="scrub"
          style={{
            background: `linear-gradient(to right, #c86242 ${pct}%, #dcd6cb ${pct}%)`,
          }}
        />

        <span className="w-10 shrink-0 text-right text-[0.8125rem] tabular-nums text-muted">{fmt(len)}</span>

        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? 'Unmute' : 'Mute'}
          className="shrink-0 rounded-full p-1 text-ink transition-colors hover:text-brand-500"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 6.5h2.5L10 3.5v11L6.5 11.5H4z" />
            {muted ? (
              <path d="M12.5 7 16 10.5M16 7l-3.5 3.5" />
            ) : (
              <path d="M12.5 6.8a3.4 3.4 0 0 1 0 4.4M14.6 5a6 6 0 0 1 0 8" />
            )}
          </svg>
        </button>
      </div>
    </div>
  );
}

function fmt(s) {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}
