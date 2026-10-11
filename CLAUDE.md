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

### Results tabs are CARDLESS (Oct 2026, from the Figma Make redesign)
All six Results tabs dropped `.card` for an editorial treatment: open sections on
cream separated by hairlines, with large Fraunces numerals carrying the hierarchy.
Shared classes live in `index.css`: **`.sheet`** (section + bottom hairline, none on
the last), **`.eyebrow`**, **`.stat-xl`**, **`.statement`**, **`.caption`**,
**`.panel`** (the one subtle bordered surface the design keeps, used for the filler
lead), **`.pill-good`/`.pill-warn`**, **`.verdict-good`/`.verdict-warn`**.
**`.card` itself is unchanged** and still used by Home, Record, History, Account and
EmailGate — do not fold these together. **The display face is now DM Serif Display**, not Fraunces (changed Oct 2026 when
the user asked for exact parity with the Figma). It is a SINGLE-WEIGHT face: never
put `font-semibold`/`font-bold` on `font-display`, there is no bold to reach and the
`font-synthesis: none` on `html` deliberately stops the browser faking one. Size and
the face's own stroke contrast carry emphasis. **The palette is now the Figma's own**
(Oct 2026, second pass): canvas `#f5f2ec`, surface `#fbfaf7`, ink `#1f1e1b`, line
`#dcd6cb`, accent `#c86242` (= `brand-500`, with `brand-100` = `#f3dfd7`), plus
semantic `good` `#287557`/`good-soft` `#deeee7` and `warn` `#99651f`/`warn-soft`
`#f3e7cc` which REPLACED Tailwind's emerald/amber everywhere. There is no red in the
design palette, so the lowest score tier uses `brand-700`. Overview's metric grid is
1 col → `sm:` 2 → `lg:` 4 with the dividers flipping from top-border to left-border;
`.metric-col` holds a 16rem min-height with the verdict line pinned by `mt-auto` so
verdicts align across columns. The Results tab bar is `ui/results-tabs.jsx` (labels
on a hairline, coral underline on the active one, scrolls on phones) — it replaced
`ui/tubelight-tabs.jsx`, which is kept but no longer used. Layout widths follow the
design: header `max-w-[86rem]`, content `max-w-[60rem]`, which is why the wordmark
sits left of where the content starts.
Filler highlights in the transcript are **coral** (`bg-brand-100` + `border-brand-500`
underline), not amber, so they match the design; the active word stays solid coral.
**Watch & Listen now has the Figma's playback selector** (Video only / Audio only /
Video + audio). The Figma mock has no real media behind it; here the modes drive one
blob — video muted, video unmuted, or an `<audio>`. Native controls are kept rather
than rebuilding the mock's custom transport, so scrubbing and mobile keep working.
Switching mode remounts the element, so the playhead is carried across via a ref, and
the transcript seeks whichever element is mounted (verified: 431 clickable words in
all three modes). The selector is hidden for audio-only takes.
`ui/ranked-bars.jsx` is the Figma's `.ranked-list`, used by Filler Words' Breakdown
(`divided`) and Vocabulary's "Words you leaned on".

### Design tokens (keep everything on these)
- Colors: `cream` bg, `sand` surfaces/dividers, `ink` text (opacity steps /80 /65 /55 /45 /35), single coral `brand` accent — no cool grays (`slate`) anywhere.
- **Light + dark theme (Oct 2026).** Every Tailwind colour is a CSS variable (`--c-*`, "R G B" triplets in `index.css`; `tailwind.config.js` maps them with `<alpha-value>`), and the header switch (`ui/theme-switch.jsx`, state in `lib/theme.js`) sets `<html data-theme="dark">`. Light values are the Figma palette; dark values are the 3D explainer video's (`speakable-3d/js/kit.js`: canvas `#07080b`, cream ink, glowing coral `#ee7a55`, mint/amber, glass cards). Rules that keep both themes correct:
  - **Never write a hex/rgba or `bg-white`/`text-white` for UI colour.** Use the tokens: `bg-card` (raised surface), `bg-surface`, `text-onbrand` (text on a coral fill), and `rgb(var(--c-brand-500))` / `themeColor()` where CSS classes can't reach (SVG `style`, canvas). No `dark:` variants: a class written once is right in both themes.
  - `ink` flips to cream in dark, so **`bg-ink` is not "a dark box"**. Things that must stay dark in both themes (the camera stage) use `.stage`.
  - The dark `brand` ramp is inverted on purpose: 50-300 sink into the canvas (tints, borders), 600-800 get lighter (hover, text).
  - Dark-only treatments (ambient haze, glass `.card`/`.panel`/`.stat-card`, `.glow-accent`) live at the bottom of `index.css`. `.glow-accent` is a no-op in light.
  - `index.html` applies the saved theme inline before first paint (no flash). Default is light; the choice is per-device (`localStorage['speakable-theme']`), not synced.
  - `ShareButton`'s exported score card is deliberately always the light card.
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

### Analytics (`lib/analytics.js` → Google Analytics 4)
Gated entirely on **`VITE_GA_ID`**: unset and Vite dead-code-eliminates the module,
so NOTHING from Google ships (verified — zero `googletagmanager` references in the
bundle). Set the id and rebuild to activate. Also skips when the visitor has Do Not
Track on, and sets `anonymize_ip`.
**GA's automatic page tracking is near-useless here**: the app never changes URL
(`App.jsx` is a state machine), so every visitor is one view of `/`. The value is the
custom funnel: `start_clicked` → `recording_started` → `recording_completed` →
`report_ready`, plus `report_failed`. Those map to the real drop-off points, above all
the gap between `recording_completed` and `report_ready`, which is the model download
and the slowest step on a first visit.
Events carry numbers and short enums only — never transcript, email, recording, or the
`speakable-anon` id. This is SEPARATE from `lib/metrics.js` (Supabase), which measures
speaking improvement over takes; analytics measures whether people arrive and finish.
Note GA4 sets cookies, so it needs a consent banner in the EU/UK; a cookieless
alternative (Vercel or Cloudflare Web Analytics) would avoid that.

### Metrics & sharing
- **Anonymous metrics** (`lib/metrics.js` → Supabase `metrics` table): fired from `App.handleRecordingComplete`, logs NUMBERS ONLY (ordinal, overall_score, filler_pct, wpm, eye_pct) under a random `speakable-anon` localStorage token — never email/auth user, never transcript/audio. Table is **write-only** (RLS insert-only, no select); owner reads aggregates in the dashboard. Impact queries are in `supabase/schema.sql`. Requires re-running that schema to create the table; absent it, inserts fail silently and nothing breaks.
- **Score card** (`components/Dashboard/ShareButton.jsx`): canvas-drawn PNG summary (score ring, stats, URL), no new deps, download-only, nothing leaves the device. **Not currently rendered** — the button was removed from the Dashboard results header in September 2026 to declutter it. The component is intact and working; re-add `<ShareButton results={results} />` to put it back (worth doing if social sharing matters, since it produces a ready-made post image).

### PWA / mobile
Installable PWA via `vite-plugin-pwa` (config in `vite.config.js`): manifest + auto-update service worker (`skipWaiting`/`clientsClaim`/`cleanupOutdatedCaches`, NetworkFirst navigations, and **`navigateFallback: null`** — setting it reintroduces a cache-first NavigationRoute and the stale-page bug). Those make the new worker take control but do NOT refresh the open page, so `lib/swUpdate.js` (called from `main.jsx`) reloads once on `controllerchange`. It is guarded to skip the first-ever registration (no controller yet) and to fire at most once per page life, so there is no reload loop and no flash on a first visit. The SW precaches only build assets (limit raised for the transformers.js chunk) — the Whisper model is cached by transformers.js itself, never by the SW. Icons (`public/pwa-*.png`, `apple-touch-icon.png`, `mic.svg`) are the coral mic mark. Mobile recording works because `getSupportedMimeType` falls back to `audio/mp4`/`video/mp4` (iOS Safari) and videos use `playsInline`; live captions silently degrade where Web Speech is unsupported. The header wordmark hides below 480px so the SegmentedNav + account chip fit.
