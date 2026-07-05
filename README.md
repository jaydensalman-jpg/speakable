# SpeakCoach

AI-powered public speaking coach. Record or upload a 1–5 minute speech and get instant coaching feedback.

## Setup

### 1. Install Node.js
Download from https://nodejs.org (v18+ recommended).

### 2. Install dependencies
```bash
cd speaking-coach
npm install          # root (installs concurrently)
npm install --prefix server
npm install --prefix client
```

### 3. Add API keys
Edit `.env` in the project root:
```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...        # Only needed for the Upload path (Whisper)
```

### 4. Run
```bash
npm run dev
```
Opens on http://localhost:5173

---

## How it works

| Path | Transcription | Notes |
|---|---|---|
| Live record | Web Speech API (browser, free) | Chrome only |
| Upload file | OpenAI Whisper (server) | Any browser, requires OpenAI key |

The Claude API (`claude-sonnet-4-6`) provides the coaching feedback report.
