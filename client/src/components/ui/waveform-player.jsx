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
// Geometry is the design's own `.waveform`: 28 bars, each 0.25rem wide with a
// 0.375rem minimum gap, spread by space-between across min(100%, 40rem) at a
// fixed 8rem height.
const BAR_COUNT = 28;
const MIN_BAR = 0.28; // the design's shortest bar; silence still reads

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
        // RMS per bucket, not peak. A bar can span several seconds on a long
        // take, and the peak of any few seconds of speech is close to maximum,
        // which flattens every bar to full height. Average energy keeps the
        // loud and quiet stretches distinguishable.
        const out = [];
        for (let i = 0; i < BAR_COUNT; i++) {
          let sum = 0;
          let count = 0;
          const start = i * size;
          for (let j = start; j < start + size && j < data.length; j++) {
            sum += data[j] * data[j];
            count++;
          }
          out.push(count ? Math.sqrt(sum / count) : 0);
        }
        // Map the take's own quiet-to-loud range onto the bar height rather
        // than scaling against absolute level: a quietly recorded take would
        // otherwise be a flat row of stubs, and a loud one a flat row of full
        // bars. The 10th/90th percentiles keep one cough or one silent gap
        // from setting the whole scale. The design's shortest bar is 28%, so
        // that is the floor.
        const sorted = [...out].sort((a, z) => a - z);
        const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
        const lo = at(0.1);
        const hi = at(0.9);
        const span = hi - lo || hi || 1;
        setPeaks(
          out.map((v) => {
            const t = Math.min(1, Math.max((v - lo) / span, 0));
            return MIN_BAR + (1 - MIN_BAR) * t;
          }),
        );
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
    <div className="glass overflow-hidden rounded-2xl border border-sand bg-surface">
      <audio ref={mediaRef} src={src} preload="metadata" className="hidden" />

      {/* .audio-visual */}
      <div className="media-well grid min-h-[21rem] content-center justify-items-center gap-6 bg-cream p-8">
        <p className="eyebrow">Your audio</p>

        {peaks && (
          <div className="flex h-32 w-[min(100%,40rem)] items-center justify-between gap-1.5" aria-hidden>
            {peaks.map((p, i) => (
              <span
                key={i}
                className="wave-bar"
                // Dark mode lights the bars the playhead has passed (index.css).
                data-played={(i + 0.5) / peaks.length <= pct / 100}
                style={{ height: `${p * 100}%` }}
              />
            ))}
          </div>
        )}

        <p className="caption">{fmt(len)} recording</p>
      </div>

      {/* .player-controls — five auto/1fr columns, no rule above it: the canvas
          panel ends and the surface begins, which is the edge in the design. */}
      <div className="grid min-h-[4.5rem] grid-cols-[auto_auto_1fr_auto_auto] items-center gap-3 px-3 md:px-6">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'Pause' : 'Play'}
          className="control-icon"
        >
          {playing ? (
            <svg viewBox="0 0 20 20" aria-hidden>
              <path d="M7.5 4v12M12.5 4v12" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" aria-hidden>
              <path d="M5.5 3.5 16 10 5.5 16.5Z" />
            </svg>
          )}
        </button>

        <span className="text-[0.8125rem] tabular-nums text-muted">{fmt(time)}</span>

        <input
          type="range"
          min="0"
          max={len || 0}
          step="0.01"
          value={Math.min(time, len || 0)}
          onChange={seek}
          aria-label="Seek"
          className="scrub"
          style={{ background: `linear-gradient(to right, rgb(var(--c-brand-500)) ${pct}%, rgb(var(--c-sand)) ${pct}%)` }}
        />

        <span className="text-[0.8125rem] tabular-nums text-muted">{fmt(len)}</span>

        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? 'Unmute' : 'Mute'}
          className="control-icon"
        >
          <svg viewBox="0 0 20 20" aria-hidden>
            <path d="M4.5 7.5h2.5L10.5 4v12L7 12.5H4.5z" />
            {muted ? <path d="M13.5 8l3.5 3.5M17 8l-3.5 3.5" /> : <path d="M13.5 7.6a3.6 3.6 0 0 1 0 4.8M15.8 5.6a6.4 6.4 0 0 1 0 8.8" />}
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
