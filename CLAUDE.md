# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The app is **Speakable** (renamed from SpeakCoach July 2026 — user-facing strings and the PWA manifest say Speakable; internal storage identifiers deliberately keep the old names so existing data survives: IndexedDB db `speakcoach`, outbox key `speakcoach-outbox`, launch config `speakcoach`).

## Running the app

Everything runs **client-only** — no backend, no API key. Recording, transcription, analysis, coaching, and history all happen in the browser.

```bash
cd client
npm install        # first time
npm run dev        # http://localhost:5173 (or next free port)
npm run build      # production build → client/dist (fully static, deployable anywhere)
```

Use **Google Chrome** for the full experience. Node comes via nvm (`nvm use --lts` if node/npm aren't found). No tests or linter are configured; verification is `npm run build` + exercising the app.

> The Express `server/` directory is **dead legacy** (old Claude-API/Whisper-server flow; nothing calls it, `client/src/api/` was deleted). The repo is a git repo; deploys are static from `client/dist` (Vercel/Netlify).

## Architecture

```
Record (MediaRecorder, video or audio; pause/resume) → blob
  → lib/transcribe.js — in-browser Whisper (transformers.js, Xenova/whisper-base.en)
       word-level timestamps + true audioDuration; handles uploads too, with an
       <audio>-element transcode fallback for containers WebAudio can't parse (.mov/HEVC)
  → utils/: detectFillerWords · computePacing(words, duration) · detectPauses
  → hooks/useEyeContact.js — camera takes only: MediaPipe Face Landmarker @ ~10fps
  → utils/localCoach.js — on-device scored report (no API)
  → Dashboard tabs: Watch & Listen · Overview · Transcript · Filler Words · Pacing · Coaching
  → lib/history.js — session (blob + report) persisted to IndexedDB → History calendar
  → lib/cloudSync.js — signed in only: the REPORT (never the blob) syncs to Supabase
```

`App.jsx` is the state machine: `home | idle | recording | processing | results | history`. Header nav is a persistent Record ⇄ History `SegmentedNav`.

### Two transcription layers — don't confuse them
- **Live captions** while recording come from the Web Speech API (`hooks/useSpeechRecognition.js`: `liveWords`/`interim`, Chrome-only, approximate). Also the *fallback* transcript if Whisper fails.
- **The report's source of truth** is Whisper, run on the final blob. It catches fillers the live engine drops. Model is lazy-loaded (code-split) and browser-cached (~145 MB first run). Trade accuracy/speed by changing `MODEL_ID` (tiny.en ↔ base.en ↔ small.en). **Phones/tablets get `tiny.en`** (~40 MB) via a UA/touch check in `transcribe.js` — base.en is too heavy for mobile Safari.

### Key constraints
- **Single Recorder instance** stays mounted across idle/recording (`App.jsx`) — unmounting mid-stream drops the mic.
- **Word format** everywhere: `{ word, start, end }` in seconds (`confidence` only from Web Speech; Whisper doesn't provide it).
- **Pause** (`MediaRecorder.pause()`) excludes paused time from the blob; the speech hook freezes via `setPaused` (its estimated timestamps drift across pauses — acceptable, it's fallback/captions only).
- **Pacing uses real audio duration** (from decoded samples), not the last word's timestamp — don't regress this.
- Whisper non-speech tokens (`[BLANK_AUDIO]`, bracketed/♪) are filtered in `transcribe.js`.

### Eye contact (`hooks/useEyeContact.js`)
Camera-mode recordings only; fully on-device (MediaPipe Face Landmarker via `@mediapipe/tasks-vision`, lazy-loaded like Whisper — WASM from jsdelivr, model from Google storage; if the load fails, recording is unaffected and no indicator shows). "Contact" = head yaw ≤ 20° AND pitch ≤ 16° (from the facial transformation matrix, Tait-Bryan Z·Y·X extraction) AND eyeLook* blendshape magnitude ≤ 0.42 — thresholds are checked independently, never summed, so sign conventions can't flip the result. 10fps sampling, 2-frames-in/3-frames-out hysteresis, pause freezes the clock. Stats (`contactPct`, `contactSeconds`, `longestStreakSeconds`, null under 3s tracked) ride through `onComplete → results.eyeContact` → Overview tab card → IndexedDB. Live UI is `EyeHint` in the Recorder, a color-only sibling of `PaceHint`.

### Filler detection (`utils/fillerWords.js`)
Regex-folded vocal hesitations (um/uh/er/hmm/em/uh-huh/huh/ugh + all elongation variants → canonical labels), crutch words, and greedy longest-first phrase matching ("you know what i mean" before "you know"). Tune coverage/precision here only.
**Whisper drops/mangles hesitations** (verified: "um"→"am"/"un", "uh"→"awe"; tiny.en is worse) — so `useSpeechRecognition` also counts them from the live recognizer's INTERIM hypotheses (per-result max, committed on final/restart, timestamped events) and `mergeFillerCounts` takes the per-label **max** of whisper vs interim (never the sum). Only unambiguous hesitations merge; crutch words repeat across interim updates and would over-count. Uploads have no live capture → Whisper counts stand alone.

### Coaching (`utils/localCoach.js`)
Strict, evidence-based: insufficient-sample gate (< 25 words or < 12s → score 1–2, zero praise), every score capped by sample size (`cap = 3 + 7·sufficiency`), highlights must be earned. Copy is plain and factual — **never** motivational/therapeutic ("AI-sounding") phrasing, here or anywhere in the UI.
Report shape: `overallScore` = plain average of the measured metrics in **`breakdown`** (pace/fillers/flow/vocabulary/articulation/eyeContact — each with raw value, target, points contributed, one plain sentence; unmeasurable metrics are OMITTED, never faked), plus **`coaching`** (2–3 weakest areas, real numbers + timestamps — filler cluster via `fillerEvents`, longest pause via `pauses[].at` — each with a concrete drill). Legacy fields (`categoryScores`/`feedback`/`tips`) are still emitted, and Overview/AIFeedback tabs keep legacy render paths because sessions saved by older builds have the old shape.

### Email gate (`components/EmailGate/`)
First "Start recording" from Home routes through an email-capture screen unless identity is already known (Supabase user, `localStorage.speakable-email`, or `speakable-guest`). Guest always works — recording is never blocked. The email is a local lead tag only (state + localStorage); pushing it to a backend is flagged in DEPLOYMENT.md. Supabase sign-in remains the real account system.

### Design tokens (keep everything on these)
- Colors: `cream` bg, `sand` surfaces/dividers, `ink` text (opacity steps /80 /65 /55 /45 /35), single coral `brand` accent — no cool grays (`slate`) anywhere.
- Type: **Fraunces** (`font-display`) for display/headings, **Inter** body.
- Motion: `ease-organic` + `duration-250/400` (tailwind.config), keyframes in `index.css` (`animate-rise`, `word-in`, `ring-out`, `eq`, `float`); animate transform/opacity only; `prefers-reduced-motion` collapses all of it. **framer-motion** (home hero only) is NOT covered by that CSS rule — components using it must check `useReducedMotion()` themselves.
- Shared classes: `.card`, `.stat-card`, `.btn-primary`; global `:focus-visible` ring.

### Client structure (non-obvious parts)
```
src/
  lib/transcribe.js   Whisper + audio decode/transcode   lib/history.js  IndexedDB sessions
  hooks/              useMediaRecorder (pause/resume) · useSpeechRecognition (live captions,
                      self-restarting) · useAudioAnalyzer (visualizer + volume stddev)
  components/
    Recorder/         stage card: capture switch, preview, live transcript (ARIA live,
                      filler highlights), PaceHint, volume-reactive glow, 3-min cap
    History/          streak stats + month calendar (intensity = sessions/day) + day drill-down
    ui/SegmentedNav   sliding-pill nav used in the header
    ui/shape-landing-hero  Kokonut UI hero adapted to the warm palette (framer-motion,
                      floating glass shapes); Home renders inside it, full-bleed
                      (App drops the max-w main wrapper for the home state only)
    ui/interactive-hover-button  the app's primary CTA (replaces .btn-primary at
                      call sites): white pill + coral seed dot that floods on
                      hover; sizing comes from the caller's className (base has
                      no padding — lib/cn.js is a plain joiner, no tailwind-merge)
```

### Known tradeoffs (intentional — don't "fix" without asking)
- `whisper-base.en` over tiny: better filler capture, bigger download, slower.
- No per-word confidence from Whisper → no "unclear word" highlighting in Transcript.
- `.mov`/HEVC upload fallback plays the file in real time to extract audio (slow but works).
- History is per-browser/per-origin (IndexedDB); clearing site data erases it.

### Accounts & cloud sync (optional — Supabase)
Configured by `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` in `client/.env.local` (see `.env.example`); **without keys the app is 100% local and the account chip doesn't render** — every cloud call site tolerates the null client from `lib/supabase.js`. Auth is email magic-link only (`hooks/useAuth.js`); the sign-in/account screen is `components/Account/`. **The privacy split is the core invariant: media blobs stay in IndexedDB on the recording device, only the report JSON syncs** (`lib/cloudSync.js` — push/pull/delete + a localStorage outbox that retries failed syncs on login, app start, and `online` events; sync never blocks the UI). On login, local reports merge up (upsert on session id = idempotent). History merges local + cloud rows (local wins, it has the blob); cloud-only sessions open with `results.cloudOnly` and SelfReviewTab shows a quiet note instead of players. Schema + RLS policies (each user only their own rows): `supabase/schema.sql`. Copy rule: never claim "nothing leaves your device" — recordings don't; reports do when signed in.

### PWA / mobile
Installable PWA via `vite-plugin-pwa` (config in `vite.config.js`): manifest + auto-update service worker. The SW precaches only build assets (limit raised for the transformers.js chunk) — the Whisper model is cached by transformers.js itself, never by the SW. Icons (`public/pwa-*.png`, `apple-touch-icon.png`, `mic.svg`) are the coral mic mark. Mobile recording works because `getSupportedMimeType` falls back to `audio/mp4`/`video/mp4` (iOS Safari) and videos use `playsInline`; live captions silently degrade where Web Speech is unsupported. The header wordmark hides below 480px so the SegmentedNav + account chip fit.
