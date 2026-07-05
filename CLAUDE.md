# CLAUDE.md

Guidance for Claude Code when working in this repo (SpeakCoach — a public-speaking practice app).

## Running the app

The core flow runs **client-only** — no backend, no API key. Recording, transcription, analysis, and coaching all happen in the browser.

```bash
cd speaking-coach/client
npm install        # first time
npm run dev        # http://localhost:5173 (or next free port)
```

Use **Google Chrome**. Requires Node via nvm (`nvm use --lts` if node/npm aren't found).

> The Express `server/` (Claude-API coaching + OpenAI-Whisper upload transcription) is **legacy/optional** — the recording flow no longer calls it. You can ignore it. The root `npm run dev` still starts both, but the client alone is enough.

## Architecture (current)

```
Record (MediaRecorder, video or audio) → blob
  → Local Whisper transcription  (client/src/lib/transcribe.js)
       transformers.js, model Xenova/whisper-base.en, word-level timestamps.
       [Web Speech API runs live during recording as a FALLBACK if Whisper fails]
  → detectFillerWords / computePacing / detectPauses   (client/src/utils/*)
  → generateLocalFeedback  (client/src/utils/localCoach.js)  — on-device scored report, no API
  → Dashboard tabs: Watch & Listen · Overview · Transcript · Filler Words · Pacing · Coaching
```

### Key points
- **No API key / no backend** for recordings. Fully local and private.
- **Transcription** = in-browser Whisper via `@xenova/transformers`. Model is lazy-loaded (dynamic import, code-split) and browser-cached (~145 MB first run). `blob → 16 kHz mono → word timestamps`; Whisper non-speech tokens like `[BLANK_AUDIO]` are filtered out. To trade accuracy vs speed, change `MODEL_ID` (tiny.en ↔ base.en ↔ small.en).
- **Filler detection** (`utils/fillerWords.js`): regex-folded vocal hesitations (um/uh/er/hmm/em/uh-huh/huh/ugh + all elongations/variants) → canonical labels, plus crutch words and greedy multi-word phrase matching. Tune coverage/precision here.
- **Coaching** (`utils/localCoach.js`): strict, evidence-based scoring. Insufficient-sample gate (too few words/seconds → low score, no fake praise); every score capped by sample size. Copy is plain and factual — **not** AI-supportive/therapeutic.
- **Single Recorder** instance stays mounted across idle/recording (`App.jsx`) — never unmount mid-stream or the mic stream drops.
- **Word format** everywhere: `{ word, start, end }` in seconds (`confidence` optional — only Web Speech provides it; Whisper does not).

### Client structure
```
src/
  App.jsx                     state machine: home | idle | recording | processing | results
  lib/transcribe.js           in-browser Whisper (transformers.js)
  hooks/
    useMediaRecorder.js        MediaRecorder wrapper (audio or video), returns blob
    useSpeechRecognition.js    Web Speech API fallback; auto-restarts mid-recording
    useAudioAnalyzer.js        live visualizer + volume stddev
  utils/
    fillerWords.js  pacing.js  pauses.js  localCoach.js
  components/
    Home/        minimal hero (21st.dev pattern)
    Recorder/    camera/audio toggle, mirrored preview, 3-min cap, upload
    Dashboard/   tabs/: SelfReviewTab, OverviewTab, TranscriptTab, FillerWordsTab, PacingTab, AIFeedbackTab
    ui/          ScoreRing, TabNav, LoadingSpinner
```

### Styling
Warm theme: cream background `#faf8f3`, single coral accent (`brand` in `tailwind.config.js`), **Fraunces** serif display + **Inter** body, `.card` / `.btn-primary` in `index.css`. Copy style: concise and factual, never motivational/AI-sounding.

### Known tradeoffs
- `whisper-base.en`: larger download + slower processing than tiny, but better filler capture.
- Whisper gives no per-word confidence → Transcript "unclear" highlighting is inactive and clarity scoring uses a neutral baseline.
- Web Speech fallback is Chrome/Edge only.
```
