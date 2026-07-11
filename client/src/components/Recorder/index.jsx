import { useState, useEffect, useRef } from 'react';
import { useMediaRecorder } from '../../hooks/useMediaRecorder.js';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition.js';
import { useAudioAnalyzer } from '../../hooks/useAudioAnalyzer.js';
import { useEyeContact } from '../../hooks/useEyeContact.js';
import { isFillerWord } from '../../utils/fillerWords.js';
import AudioVisualizer from './AudioVisualizer.jsx';
import UploadZone from './UploadZone.jsx';
import { InteractiveHoverButton } from '../ui/interactive-hover-button.jsx';

const MAX_SECONDS = 180; // 3 minutes — a focused, repeatable practice length.

export default function Recorder({ onComplete, onRecordingStart }) {
  const [mode, setMode] = useState('record'); // record | upload
  const [captureMode, setCaptureMode] = useState('camera'); // camera | audio
  const [recState, setRecState] = useState('idle'); // idle | recording | paused
  const [elapsed, setElapsed] = useState(0);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [permissionError, setPermissionError] = useState(null);

  const { start: startRecorder, stop: stopRecorder, pause: pauseRecorder, resume: resumeRecorder } = useMediaRecorder();
  const { start: startSpeech, stop: stopSpeech, setPaused: setSpeechPaused, liveWords, interim } = useSpeechRecognition();
  const { connect: connectAnalyzer, disconnect: disconnectAnalyzer, getAnalyser } = useAudioAnalyzer();
  const { start: startEyeContact, stop: stopEyeContact, setPaused: setEyePaused, live: eyeLive } = useEyeContact();

  const isRecording = recState === 'recording';
  const isActive = recState !== 'idle';

  const timerRef = useRef(null);
  const videoRef = useRef(null);
  const glowRef = useRef(null);
  // Stable ref so the timer closure always calls the latest handleStop
  const handleStopRef = useRef(null);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setElapsed((e) => {
          if (e + 1 >= MAX_SECONDS) {
            clearInterval(timerRef.current);
            handleStopRef.current?.();
            return MAX_SECONDS;
          }
          return e + 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  // Volume-reactive glow behind the record button — transform/opacity only,
  // driven outside React state, disabled for prefers-reduced-motion.
  useEffect(() => {
    if (!isRecording) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf;
    const data = new Uint8Array(64);
    const tick = () => {
      const analyser = getAnalyser();
      const el = glowRef.current;
      if (analyser && el) {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const level = sum / data.length / 255; // 0..1
        el.style.transform = `scale(${1 + level * 0.8})`;
        el.style.opacity = `${0.25 + level * 0.5}`;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [isRecording, getAnalyser]);

  async function handleStart() {
    setPermissionError(null);
    const withVideo = captureMode === 'camera';
    try {
      const stream = await startRecorder(withVideo);
      if (withVideo && videoRef.current) {
        videoRef.current.srcObject = stream;
        // Analyzes the preview frames on-device; fire-and-forget so a slow
        // model load never delays the recording itself.
        startEyeContact(videoRef.current);
      }
      startSpeech();
      connectAnalyzer(stream);
      setRecState('recording');
      setElapsed(0);
      onRecordingStart();
    } catch (err) {
      setPermissionError(
        withVideo
          ? "Can't access the camera. Allow camera access in your browser, or switch to Audio only."
          : "Can't access the microphone. Allow mic access in your browser and try again."
      );
    }
  }

  function handlePause() {
    pauseRecorder();
    setSpeechPaused(true); // paused time is excluded from the blob; live captions freeze
    setEyePaused(true); // eye-contact clock freezes too, so percentages stay honest
    setRecState('paused');
  }

  function handleResume() {
    resumeRecorder();
    setSpeechPaused(false);
    setEyePaused(false);
    setRecState('recording');
  }

  async function handleStop() {
    setRecState('idle');
    const eyeContact = stopEyeContact(); // null unless a camera take tracked enough
    if (videoRef.current) videoRef.current.srcObject = null;
    const [blob, speech, volumeLevels] = await Promise.all([
      stopRecorder(),
      stopSpeech(),
      Promise.resolve(disconnectAnalyzer()),
    ]);
    onComplete({
      blob,
      words: speech.words,
      hesitations: speech.hesitations, // interim-captured "um"/"uh" Whisper drops
      volumeLevels,
      eyeContact,
      source: 'record',
      mediaType: captureMode === 'camera' ? 'video' : 'audio',
    });
  }

  handleStopRef.current = handleStop;

  async function handleUploadSubmit() {
    if (!uploadedFile) return;
    const blob = new Blob([await uploadedFile.arrayBuffer()], { type: uploadedFile.type });
    onComplete({
      blob,
      words: [],
      hesitations: null, // uploads have no live capture; Whisper counts stand alone
      volumeLevels: [],
      source: 'upload',
      mediaType: uploadedFile.type.startsWith('video/') ? 'video' : 'audio',
    });
  }

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="max-w-2xl mx-auto animate-rise">
      <div className="text-center mb-8">
        <h1 className="text-[2.4rem] font-semibold text-ink leading-[1.1] tracking-tight mb-2">
          Record a talk
        </h1>
        <p className="text-ink/55 text-lg">Up to three minutes. Camera or audio only.</p>
      </div>

      {/* Mode toggle */}
      <div className="flex bg-sand p-1 rounded-full mb-6 max-w-[240px] mx-auto">
        {[
          { id: 'record', label: 'Record' },
          { id: 'upload', label: 'Upload' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => !isActive && setMode(id)}
            disabled={isActive}
            className={`flex-1 py-2 text-sm font-medium rounded-full transition-all duration-250 ease-organic ${
              mode === id
                ? 'bg-white text-ink shadow-soft'
                : 'text-ink/50 hover:text-ink/80 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'record' ? (
        <div className="card p-0 overflow-hidden">
          {/* Stage header: capture switch + timer */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <div className="flex items-center gap-1">
              {[
                { id: 'camera', label: 'Camera' },
                { id: 'audio', label: 'Audio only' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => !isActive && setCaptureMode(id)}
                  disabled={isActive}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all duration-250 ease-organic ${
                    captureMode === id
                      ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200'
                      : 'text-ink/40 hover:text-ink/70 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className={`flex items-center gap-2 font-mono text-sm tabular-nums transition-opacity duration-250 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
              {recState === 'paused' ? (
                <span className="text-[11px] font-sans font-semibold uppercase tracking-wide text-amber-600">Paused</span>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              )}
              <span className="text-ink font-semibold">{formatTime(elapsed)}</span>
              <span className="text-ink/35">/ 3:00</span>
            </div>
          </div>

          {/* Preview stage */}
          <div className="px-5">
            {captureMode === 'camera' ? (
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-ink/95">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-cover -scale-x-100"
                />
                {!isActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/60">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    <p className="text-xs">Camera turns on when you press record</p>
                    <p className="text-[11px] text-white/35 px-6 text-center">
                      Eye contact is tracked on your device while you speak — video is analyzed in your browser, never uploaded.
                    </p>
                  </div>
                )}
                {recState === 'paused' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-ink/40 backdrop-blur-[2px]">
                    <span className="rounded-full bg-white/90 px-4 py-1.5 text-xs font-semibold text-ink">Paused</span>
                  </div>
                )}
              </div>
            ) : (
              <AudioVisualizer getAnalyser={getAnalyser} isActive={isRecording} />
            )}
          </div>

          {/* Live transcript — captions ease in as you speak */}
          <div className="px-5 pt-4">
            <div className="flex items-end justify-between gap-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/35">Live transcript</p>
              <div className="flex items-center gap-4">
                <EyeHint state={eyeLive} active={isRecording && captureMode === 'camera'} />
                <PaceHint liveWords={liveWords} elapsed={elapsed} active={isRecording} />
              </div>
            </div>
            <div
              role="log"
              aria-live="polite"
              aria-label="Live transcription"
              className="mt-2 flex h-[4.5rem] items-end overflow-hidden rounded-2xl bg-cream px-4 py-3"
            >
              {liveWords.length === 0 && !interim ? (
                <p className="text-sm text-ink/35">
                  {isActive ? 'Listening…' : 'Your words appear here as you speak.'}
                </p>
              ) : (
                <p className="text-[15px] leading-relaxed text-ink/80">
                  {liveWords.map((w) => (
                    <span key={w.i} className="animate-word-in inline-block will-change-transform">
                      <span className={isFillerWord(w.word) ? 'rounded bg-amber-100/80 px-0.5 text-amber-900' : undefined}>
                        {w.word}
                      </span>
                      {' '}
                    </span>
                  ))}
                  {interim && <span className="text-ink/35">{interim}</span>}
                </p>
              )}
            </div>
          </div>

          {/* Progress */}
          <div className="px-5 pt-4">
            <div className="h-1 w-full overflow-hidden rounded-full bg-sand">
              <div
                className="h-full rounded-full bg-brand-400 transition-[width] duration-1000 ease-linear"
                style={{ width: `${(elapsed / MAX_SECONDS) * 100}%` }}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-5 px-5 py-6">
            {/* Left slot — pause/stop secondary action, keeps the primary centered */}
            <div className="w-12">
              {recState === 'recording' && (
                <button
                  onClick={handlePause}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-sand text-ink/60 transition-all duration-250 ease-organic hover:bg-sand/70 hover:text-ink active:scale-95"
                  aria-label="Pause recording"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5h3v14H8zM13 5h3v14h-3z" />
                  </svg>
                </button>
              )}
              {recState === 'paused' && (
                <button
                  onClick={handleStop}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500 ring-1 ring-red-200 transition-all duration-250 ease-organic hover:bg-red-100 active:scale-95"
                  aria-label="Finish and analyze"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
              )}
            </div>

            {/* Primary button with reactive glow + expanding rings */}
            <div className="relative">
              {isRecording && (
                <>
                  <span aria-hidden className="animate-ring-out absolute inset-0 rounded-full border-2 border-brand-300" />
                  <span aria-hidden className="animate-ring-out absolute inset-0 rounded-full border-2 border-brand-300" style={{ animationDelay: '1.1s' }} />
                </>
              )}
              <span
                ref={glowRef}
                aria-hidden
                className="absolute -inset-2 rounded-full bg-brand-400/40 blur-xl transition-opacity duration-400"
                style={{ opacity: isRecording ? 0.3 : 0 }}
              />
              {recState === 'idle' && (
                <button
                  onClick={handleStart}
                  className="relative flex h-20 w-20 items-center justify-center rounded-full bg-brand-500 text-white shadow-soft transition-all duration-250 ease-organic hover:scale-105 hover:bg-brand-600 active:scale-95"
                  aria-label="Start recording"
                >
                  <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1a4 4 0 014 4v7a4 4 0 01-8 0V5a4 4 0 014-4zm-2 15.93A7 7 0 0019 12h2a9 9 0 01-18 0h2a7 7 0 006 6.93V21H9v2h6v-2h-2v-2.07z" />
                  </svg>
                </button>
              )}
              {recState === 'recording' && (
                <button
                  onClick={handleStop}
                  className="relative flex h-20 w-20 items-center justify-center rounded-full bg-red-500 text-white shadow-soft transition-all duration-250 ease-organic hover:scale-105 hover:bg-red-600 active:scale-95"
                  aria-label="Stop and analyze"
                >
                  <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
              )}
              {recState === 'paused' && (
                <button
                  onClick={handleResume}
                  className="relative flex h-20 w-20 items-center justify-center rounded-full bg-brand-500 text-white shadow-soft transition-all duration-250 ease-organic hover:scale-105 hover:bg-brand-600 active:scale-95"
                  aria-label="Resume recording"
                >
                  <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5.14v13.72c0 .84.93 1.35 1.64.9l10.02-6.86a1.06 1.06 0 000-1.8L9.64 4.24A1.06 1.06 0 008 5.14z" />
                  </svg>
                </button>
              )}
            </div>

            {/* Right slot — balances the layout */}
            <div className="w-12" />
          </div>

          <p className="pb-4 text-center text-sm text-ink/45">
            {recState === 'idle' && 'Click to start'}
            {recState === 'recording' && 'Recording — pause or stop when done'}
            {recState === 'paused' && 'Paused — resume when ready'}
          </p>

          {permissionError && (
            <div className="mx-5 mb-5 rounded-2xl border border-brand-100 bg-brand-50 p-3.5 text-sm leading-relaxed text-brand-700">
              {permissionError}
            </div>
          )}

          <p className="border-t border-sand px-5 py-4 text-center text-xs text-ink/35">
            Recordings stay on this device — only reports sync if you sign in. Works best in Chrome.
          </p>
        </div>
      ) : (
        <div className="card flex flex-col gap-4">
          <UploadZone onFile={setUploadedFile} />
          {uploadedFile && (
            <div className="flex items-center justify-between p-3 bg-brand-50 rounded-2xl border border-brand-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{uploadedFile.name}</p>
                  <p className="text-xs text-ink/40">{(uploadedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              </div>
              <button
                onClick={() => setUploadedFile(null)}
                className="w-7 h-7 rounded-full bg-white border border-sand flex items-center justify-center text-ink/40 hover:text-ink/70 transition-colors shrink-0 ml-2"
                aria-label="Remove file"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          <InteractiveHoverButton
            onClick={handleUploadSubmit}
            disabled={!uploadedFile}
            text="Analyze recording"
            className="w-full px-6 py-3"
          />
        </div>
      )}
    </div>
  );
}

// Ambient eye-contact readout, sibling to PaceHint: a dot that settles on green
// while you hold the camera's gaze and amber when you drift. Color-only changes
// (no motion), so prefers-reduced-motion needs nothing special here.
function EyeHint({ state, active }) {
  if (!active || state === null) return null;
  const contact = state === 'contact';
  return (
    <span
      className={`flex items-center gap-1.5 text-xs transition-colors duration-400 ${
        contact ? 'text-ink/50' : 'text-ink/30'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full transition-colors duration-400 ${
          contact ? 'bg-emerald-500' : 'bg-amber-500'
        }`}
      />
      {contact ? 'eye contact' : 'eyes away'}
    </span>
  );
}

// Ambient pace readout: rolling WPM over the last 15s of speech. Appears only
// once there's enough signal; never demands attention.
function PaceHint({ liveWords, elapsed, active }) {
  if (!active) return <span className="h-4" />;
  const windowStart = Math.max(0, elapsed - 15);
  const recent = liveWords.filter((w) => w.end >= windowStart);
  if (recent.length < 8) return <span className="h-4" />;

  const span = Math.max(recent.at(-1).end - recent[0].start, 4);
  const wpm = Math.round((recent.length / span) * 60);
  const inRange = wpm >= 115 && wpm <= 170;
  const breathing = elapsed - (liveWords.at(-1)?.end ?? 0) > 3;

  return (
    <span className={`flex items-center gap-1.5 text-xs tabular-nums transition-opacity duration-400 ${breathing ? 'text-ink/30' : 'text-ink/50'}`}>
      <span className={`h-1.5 w-1.5 rounded-full transition-colors duration-400 ${inRange ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      ≈ {wpm} wpm
    </span>
  );
}
