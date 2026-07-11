# Speakable

**A public-speaking coach that runs entirely in your browser — your recordings never leave your device.**

🎤 **Live app: [speakable-omega.vercel.app](https://speakable-omega.vercel.app)** — works on desktop and phones, installable as an app (Add to Home Screen).

Record a short talk (or upload one), and Speakable transcribes it, measures how you actually spoke, and coaches you on the two or three things that will improve your next take — all on-device, free, no API keys.

## What it measures

| Metric | How |
|---|---|
| **Transcript** | OpenAI Whisper running *in the browser* via transformers.js (WASM) — word-level timestamps, no server |
| **Filler words** | Whisper text + live capture of "um"/"uh" from speech-recognizer interim hypotheses (Whisper's training data scrubs disfluencies, so interims are the only reliable source — see `client/src/utils/fillerWords.js`) |
| **Pacing** | Words per minute against true decoded audio duration, with over-time segments |
| **Pauses** | Gaps ≥2s from word timestamps, with locations |
| **Eye contact** | MediaPipe Face Landmarker at 10fps on the camera preview — head pose from the facial transformation matrix + gaze blendshapes, with hysteresis |
| **Score** | Transparent by construction: the overall score is the plain average of the measured metrics, and the report shows each metric's raw value, target range, and points contributed. Unmeasurable metrics are hidden, never faked. |

Coaching is generated on-device from the take's real numbers ("your densest filler cluster was around 0:45") with concrete drills — no LLM, no canned praise, and short samples are score-capped because there isn't enough evidence to grade them.

## Privacy architecture

- **Recordings (video/audio) never leave the device.** They live in IndexedDB, full stop. There is deliberately no code path that uploads media.
- **Reports optionally sync.** With the (optional, never required) email magic-link account, the report JSON — scores, stats, transcript — syncs via Supabase with row-level security so each user can only touch their own rows (`supabase/schema.sql`). Without keys configured, the app is 100% local.

## Stack

React 18 + Vite + Tailwind · [@xenova/transformers](https://github.com/xenova/transformers.js) (Whisper) · [@mediapipe/tasks-vision](https://developers.google.com/mediapipe) (Face Landmarker) · Web Speech API (live captions + interim filler capture) · framer-motion · Supabase (auth + report sync) · PWA via vite-plugin-pwa · Vercel with continuous deployment from this repo.

## Run it locally

```bash
cd client
npm install
npm run dev        # http://localhost:5173 — use Chrome for the full experience
```

No configuration needed. The first analysis downloads the Whisper model once (~145 MB desktop / ~40 MB mobile) and caches it in the browser. To enable accounts locally, copy `client/.env.example` to `client/.env.local` and add Supabase keys.

## Deploying

See [DEPLOYMENT.md](DEPLOYMENT.md) — pushes to `main` auto-deploy to production; branches get preview URLs.

---

Built by [Jayden Salman](https://github.com/jaydensalman-jpg) (Informatics, University of Washington).
