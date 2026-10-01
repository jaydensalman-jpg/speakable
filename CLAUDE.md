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

> The Express `server/` directory is **dead legacy** (old Claude-API/Whisper-server flow; nothing calls it, `client/src/api/` was deleted). **Deploys are continuous:** pushing the GitHub repo (`jaydensalman-jpg/speakable`) auto-builds on Vercel, live at **speakable-omega.vercel.app**. Full setup + the client-vs-backend split are in `DEPLOYMENT.md`. Static output is `client/dist`.

## Architecture

```
Record (MediaRecorder, video or audio; pause/resume) → blob
  → lib/transcribe.js — in-browser Whisper (transformers.js, Xenova/whisper-base.en)
       word-level timestamps + true audioDuration; handles uploads too, with an
       <audio>-element transcode fallback for containers WebAudio can't parse (.mov/HEVC)
  → utils/: detectFillerWords · computePacing(words, duration) · detectPauses
  → hooks/useEyeContact.js — camera takes only: MediaPipe Face Landmarker @ ~10fps
  → utils/localCoach.js — on-device scored report (no API)
  → Dashboard tabs: Watch & Listen (transcript lives here) · Overview · Filler Words · Vocabulary · Coaching
  → lib/history.js — session (blob + report) persisted to IndexedDB → History calendar
  → lib/cloudSync.js — signed in only: the REPORT (never the blob) syncs to Supabase
```

`App.jsx` is the state machine: `home | idle | recording | processing | results | history`. Header nav is a persistent Record ⇄ History `SegmentedNav`.

### Two transcription layers — don't confuse them
- **Live captions** while recording come from the Web Speech API (`hooks/useSpeechRecognition.js`: `liveWords`/`interim`, Chrome-only, approximate). Also the *fallback* transcript if Whisper fails.
- **The report's source of truth** is Whisper, run on the final blob. It catches fillers the live engine drops. Model is lazy-loaded (code-split) and browser-cached. **Desktop runs `small.en`** (~238 MB quantized), raised from base.en in September 2026 because model size is the main lever on filler capture: Whisper normalizes disfluencies away and the smaller the variant the harder it does so. **Phones/tablets get `tiny.en`** (~40 MB) via a UA/touch check in `transcribe.js` — base.en was already too heavy for mobile Safari, so small.en is out of the question there. Note the usual fix for disfluency capture (priming the decoder with a filler-heavy prompt) is NOT available: transformers.js 2.17's `prompt_ids` carries language/task only, not text conditioning.

### Key constraints
- **Single Recorder instance** stays mounted across idle/recording (`App.jsx`) — unmounting mid-stream drops the mic.
- **Word format** everywhere: `{ word, start, end }` in seconds (`confidence` only from Web Speech; Whisper doesn't provide it).
- **Pause** (`MediaRecorder.pause()`) excludes paused time from the blob; the speech hook freezes via `setPaused` (its estimated timestamps drift across pauses — acceptable, it's fallback/captions only).
- **Pacing uses real audio duration** (from decoded samples), not the last word's timestamp — don't regress this.
- Whisper non-speech tokens are filtered in `transcribe.js`, but ONLY genuine annotations (`[BLANK_AUDIO]`, `(silence)`, `(laughter)`, ♪ …) via the `NON_SPEECH` list. Until September 2026 this dropped EVERY bracketed token, which silently deleted real fillers — Whisper also brackets vocalizations as `(um)` / `[uh]`. Brackets are now stripped and the inner word kept unless it matches `NON_SPEECH`. Never add um/uh/mm/er to that list.
- `window.__speakableDebug` holds the last run's raw Whisper chunks + model id (on-device only, never logged or sent). It is the way to tell whether a missing filler was never transcribed or was dropped downstream.

### Eye contact (`hooks/useEyeContact.js`)
Camera-mode recordings only; fully on-device (MediaPipe Face Landmarker via `@mediapipe/tasks-vision`, lazy-loaded like Whisper — WASM from jsdelivr, model from Google storage; if the load fails, recording is unaffected and no indicator shows). "Contact" = head yaw ≤ 20° AND pitch ≤ 16° (from the facial transformation matrix, Tait-Bryan Z·Y·X extraction) AND eyeLook* blendshape magnitude ≤ 0.42 — thresholds are checked independently, never summed, so sign conventions can't flip the result. 10fps sampling, 2-frames-in/3-frames-out hysteresis, pause freezes the clock. Stats (`contactPct`, `contactSeconds`, `longestStreakSeconds`, null under 3s tracked) ride through `onComplete → results.eyeContact` → Overview tab card → IndexedDB. Live UI is `EyeHint` in the Recorder, a color-only sibling of `PaceHint`.

### Filler detection (`utils/fillerWords.js`)
Regex-folded vocal hesitations (um/uh/er/hmm/em/uh-huh/huh/ugh + all elongation variants → canonical labels), crutch words, and greedy longest-first phrase matching ("you know what i mean" before "you know"). Tune coverage/precision here only.
**Accuracy over recall (changed July 2026).** Earlier builds guessed at "um"/"uh" acoustically (voiced-frame runs in gaps) and by injecting them into the transcript. That produced PHANTOM fillers ("um um um um um" where the user said none/one), which is unacceptable for a tool people rely on. That acoustic detector is **removed**. Fillers now come ONLY from what Whisper actually transcribed. The one correction: `collapseRepeatedFillers` (in `utils/fillerWords.js`) merges a sustained "ummmm" that Whisper emits as several `um` tokens (same label, gaps ≤0.35s) into ONE occurrence. That window was 0.8s until September 2026, which also merged genuinely separate hesitations ("um ... um" with a beat between) and under-counted real fillers; sustained-run tokens sit 0–0.2s apart, so 0.35s catches them without swallowing distinct ums. `displayWords = collapseRepeatedFillers(wordList)` is the exact transcript shown; `fillerWordCounts = detectFillerWords(displayWords)`, so the transcript and every filler number derive from one list. Verified: clean speech → 0 fillers; a 6-token sustained um → 1. This is bounded by Whisper's accuracy (no ASR is literally 100%) but has no fabrication.

### Coaching (`utils/localCoach.js`)
Strict, evidence-based: insufficient-sample gate (< 25 words or < 12s → score 1–2, zero praise), every score capped by sample size (`cap = 3 + 7·sufficiency`), highlights must be earned. Copy is plain and factual — **never** motivational/therapeutic ("AI-sounding") phrasing, here or anywhere in the UI.
Report shape: `overallScore` = plain average of the measured metrics in **`breakdown`** — FOUR scored areas since September 2026 (pace/fillers/vocabulary/eyeContact, each with raw value, target, points contributed, one plain sentence; unmeasurable metrics are OMITTED, never faked). `flow` was dropped along with the Pacing tab, and `articulation` with it, since articulation only ever appeared on the Web Speech fallback path and so made the score mean different things depending on which recognizer ran. Plus **`coaching`** (2–3 weakest areas, real numbers + timestamps — filler cluster via `fillerEvents`, longest pause via `pauses[].at` — each with a concrete drill). Legacy fields (`categoryScores`/`feedback`/`tips`) are still emitted, and Overview/AIFeedback tabs keep legacy render paths because sessions saved by older builds have the old shape.

### Email gate (`components/EmailGate/`)
First "Start recording" from Home routes through an email-capture screen unless identity is already known (Supabase user, `localStorage.speakable-email`, or `speakable-guest`). Guest always works — recording is never blocked. The email is a local lead tag only (state + localStorage); pushing it to a backend is flagged in DEPLOYMENT.md. Supabase sign-in remains the real account system.

### Design tokens (keep everything on these)
- Colors: `cream` bg, `sand` surfaces/dividers, `ink` text (opacity steps /80 /65 /55 /45 /35), single coral `brand` accent — no cool grays (`slate`) anywhere.
- Type: **Fraunces** (`font-display`) for display/headings, **Inter** body.
- Motion: `ease-organic` + `duration-250/400` (tailwind.config), keyframes in `index.css` (`animate-rise`, `word-in`, `ring-out`, `eq`, `float`); animate transform/opacity only; `prefers-reduced-motion` collapses all of it. **framer-motion** (home hero `shape-landing-hero` and the results `tubelight-tabs`) is NOT covered by that CSS rule — components using it must check `useReducedMotion()` themselves.
- Shared classes: `.card`, `.stat-card`, `.btn-primary`; global `:focus-visible` ring.

### Client structure (non-obvious parts)
```
src/
  lib/transcribe.js   Whisper + audio decode/transcode   lib/history.js  IndexedDB sessions
  hooks/              useMediaRecorder (pause/resume) · useSpeechRecognition (live captions,
                      self-restarting) · useAudioAnalyzer (visualizer + volume stddev)
  components/
    Recorder/         stage card: capture switch, preview, live transcript (ARIA live,
                      filler highlights), PaceHint, volume-reactive glow, 3-min cap.
                      IdeaGenerator subcomponent (idle+record only) shows a random
                      practice prompt from utils/ideas.js (Shuffle/Dismiss)
    History/          streak stats + month calendar (intensity = sessions/day) + day drill-down
    ui/SegmentedNav   sliding-pill nav used in the header
    ui/tubelight-tabs  results tab bar: clean full-width segmented control, a white
                      pill that springs to the active tab via framer-motion shared
                      layout (the original 21st.dev "lamp" glow was removed — it read
                      unprofessional). Labels on desktop, icons on mobile; width
                      matches the result cards. Controlled (active/onChange).
    ui/shape-landing-hero  Kokonut UI hero adapted to the warm palette (framer-motion,
                      floating glass shapes); Home renders inside it, full-bleed
                      (App drops the max-w main wrapper for the home state only)
    ui/interactive-hover-button  the app's primary CTA (replaces .btn-primary at
                      call sites): white pill + coral seed dot that floods on
                      hover; sizing comes from the caller's className (base has
                      no padding — lib/cn.js is a plain joiner, no tailwind-merge)
```

### Known tradeoffs (intentional — don't "fix" without asking)
- `whisper-small.en` on desktop over base/tiny: better filler capture, bigger download (~238 MB), ~1.5–2x slower inference.
- No per-word confidence from Whisper → no "unclear word" highlighting in Transcript.
- `.mov`/HEVC upload fallback plays the file in real time to extract audio (slow but works).
- History is per-browser/per-origin (IndexedDB); clearing site data erases it.

### Accounts & cloud sync (optional — Supabase)
Configured by `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` in `client/.env.local` (see `.env.example`); **without keys the app is 100% local and the account chip doesn't render** — every cloud call site tolerates the null client from `lib/supabase.js`. Auth is email magic-link only (`hooks/useAuth.js`); the sign-in/account screen is `components/Account/`. **The privacy split is the core invariant: media blobs stay in IndexedDB on the recording device, only the report JSON syncs** (`lib/cloudSync.js` — push/pull/delete + a localStorage outbox that retries failed syncs on login, app start, and `online` events; sync never blocks the UI). On login, local reports merge up (upsert on session id = idempotent). History merges local + cloud rows (local wins, it has the blob); cloud-only sessions open with `results.cloudOnly` and SelfReviewTab shows a quiet note instead of players. Schema + RLS policies (each user only their own rows): `supabase/schema.sql`. Copy rule: never claim "nothing leaves your device" — recordings don't; reports do when signed in.

### Dashboard tabs
Watch & Listen · Overview · Filler Words · Words to Cut · Vocabulary · Coaching.
**Words to Cut** (`tabs/WordsToCutTab.jsx` + `utils/weakWords.js`): low-value language (hedges, empty qualifiers, vague words), scanned from the transcript, deliberately gentle and kept NON-overlapping with `fillerWords.js` (a token already a filler is skipped). **Coaching** carries an "Also keep an eye on" checklist (every off-target `breakdown` metric + weak-word load) below the detailed drills; and coaching drills only cover `!inRange` metrics (an on-target metric must never be dressed up as a weakness, even when a short-sample cap drops its score under 8). **The transcript lives inside Watch & Listen** (`components/Dashboard/Transcript.jsx`, rendered beneath the players); pass it the audio `mediaRef` and each word becomes clickable (seeks the audio to that word's `start`) with the word under the playhead highlighted as it plays. No standalone Transcript tab. **There is no Pacing tab** (removed September 2026 with `tabs/PacingTab.jsx`); pace is still scored and still has its own Overview card with the WPM sparkline. `results.pauses` is still computed and stored, just no longer surfaced. **Vocabulary** (`tabs/VocabularyTab.jsx`) explains unique-word ratio in plain terms, lists the content words you repeated 3+ times (stopwords/fillers excluded), and spells out what counts as "the same word."

### Metrics & sharing
- **Anonymous metrics** (`lib/metrics.js` → Supabase `metrics` table): fired from `App.handleRecordingComplete`, logs NUMBERS ONLY (ordinal, overall_score, filler_pct, wpm, eye_pct) under a random `speakable-anon` localStorage token — never email/auth user, never transcript/audio. Table is **write-only** (RLS insert-only, no select); owner reads aggregates in the dashboard. Impact queries are in `supabase/schema.sql`. Requires re-running that schema to create the table; absent it, inserts fail silently and nothing breaks.
- **Score card** (`components/Dashboard/ShareButton.jsx`): canvas-drawn PNG summary (score ring, stats, URL), no new deps, download-only, nothing leaves the device. **Not currently rendered** — the button was removed from the Dashboard results header in September 2026 to declutter it. The component is intact and working; re-add `<ShareButton results={results} />` to put it back (worth doing if social sharing matters, since it produces a ready-made post image).

### PWA / mobile
Installable PWA via `vite-plugin-pwa` (config in `vite.config.js`): manifest + auto-update service worker (`skipWaiting`/`clientsClaim`/`cleanupOutdatedCaches`, NetworkFirst navigations, and **`navigateFallback: null`** — setting it reintroduces a cache-first NavigationRoute and the stale-page bug). Those make the new worker take control but do NOT refresh the open page, so `lib/swUpdate.js` (called from `main.jsx`) reloads once on `controllerchange`. It is guarded to skip the first-ever registration (no controller yet) and to fire at most once per page life, so there is no reload loop and no flash on a first visit. The SW precaches only build assets (limit raised for the transformers.js chunk) — the Whisper model is cached by transformers.js itself, never by the SW. Icons (`public/pwa-*.png`, `apple-touch-icon.png`, `mic.svg`) are the coral mic mark. Mobile recording works because `getSupportedMimeType` falls back to `audio/mp4`/`video/mp4` (iOS Safari) and videos use `playsInline`; live captions silently degrade where Web Speech is unsupported. The header wordmark hides below 480px so the SegmentedNav + account chip fit.
