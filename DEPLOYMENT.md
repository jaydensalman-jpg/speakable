# Deploying Speakable

The app is a fully static React (Vite) build — `client/dist` can be hosted anywhere.
It is live today at **https://speakable-omega.vercel.app** on the Vercel project
`speakable`, deployed manually from this folder. This doc covers (A) the current
manual deploy, (B) upgrading to continuous deployment from GitHub so every push
auto-updates the live site for all users, (C) what runs client-side vs. what
needs a backend, (D) the security headers, and (E) the Supabase settings that
only exist in its dashboard.

---

## A. Manual deploy (works today)

```bash
cd client
npx vercel deploy --prod --yes
```

That's it — Vercel builds with `npm run build` (see `client/vercel.json`) and swaps
the live site. Use this until the GitHub flow below is set up.

Since October 2026 this path is a fallback only: `client/vercel.json` has none of the
security headers or the `/privacy` rewrite, which live in the root `vercel.json`
(section D). A deploy made this way serves the app without them and `/privacy` 404s.

## B. Continuous deployment — LIVE since July 2026 ✅

`git push` → Vercel builds → live site updates for everyone, automatically.

- Repo: **https://github.com/jaydensalman-jpg/speakable** (public)
- Connected to Vercel project `speakable`; builds use the root `vercel.json`
  (install/build inside `client/`, output `client/dist`).
- The one-time setup that made this work: GitHub repo created and pushed
  (`gh repo create speakable --public --source . --push`), GitHub added as a
  Login Connection on the Vercel account, the Vercel GitHub App installed with
  access to the repo, then `npx vercel git connect <repo-url>`.

**Environment variables** — already set on the project (`VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY` for Production). If you ever recreate the project, re-add
them under **Settings → Environment Variables**. They are baked in at build time,
so changing them requires a redeploy. If `VITE_SUPABASE_URL` ever changes, change
the Supabase host in the `connect-src` of `vercel.json` too (section D).

`VITE_GA_ID` is optional and unset today. Setting it (a GA4 measurement id,
`G-XXXXXXXXXX`) turns on the funnel events in `lib/analytics.js` and makes the
privacy page show its Google Analytics paragraph. GA4 sets cookies, so add a consent
banner first if you expect EU/UK visitors.

### Day-to-day after setup

```bash
git add -A && git commit -m "describe the change"
git push
```

- Every push to `main` triggers a production build (~1 min) and goes live automatically.
- Every push to any other branch gets its own **preview URL** — test there, then merge
  to `main` to ship.
- Rollback: Vercel dashboard → Deployments → pick a previous one → **Promote to Production**.

### How updates reach users

- **Browser visitors** get the new version on next page load.
- **Installed PWA users** ("Add to Home Screen"): the service worker checks for a new
  version on launch and auto-updates (`registerType: 'autoUpdate'` in `vite.config.js`).
  `lib/swUpdate.js` then reloads the page once when the new worker takes control, so the update lands on THIS visit. Without that reload the new worker claims the page but the already-loaded HTML/JS keep running, which is the "I opened the link and it's still the old version" bug (it looks like a broken deploy but is entirely client-side).
- **The Whisper model** is cached separately per device (~40–145 MB) and is unaffected
  by app updates — users don't re-download it.

---

## C. Client-side vs. backend — what's what

Runs 100% client-side (no backend needed, works offline after first load):
- Recording, Whisper transcription, filler/pacing/pause analysis, eye-contact tracking,
  scoring & coaching, IndexedDB history. **Recordings never leave the device by design** —
  don't add a code path that uploads media without revisiting the privacy copy.

Needs the existing Supabase backend (free tier, already configured):
- Email magic-link sign-in and cross-device sync of session REPORTS (`sessions` table,
  row-level security; schema in `supabase/schema.sql`). Add new synced fields by
  extending the `results` JSON — no migration needed.
- Anonymous per-take numbers (`metrics` table) and email-gate signups (`leads` table,
  with the visit's `utm_source`). Both are insert-only from the browser; read them
  with the owner queries at the bottom of each section of `supabase/schema.sql`.
  Until that file has been run in the SQL editor these inserts fail silently and
  nothing else breaks; a failed signup is retried on the visitor's next app start.

Not served by Speakable, but worth knowing: **live captions use the browser's own
speech recognition** (`hooks/useSpeechRecognition.js`). In Chrome that streams
microphone audio to Google while recording. The privacy page says so; making
captions opt-in would be the way to change it.

Would need NEW backend work (flagged, not built):
- Rate limiting on the two insert-only tables. The check constraints stop impossible
  values, not volume; a Vercel function or Supabase Edge Function in front would.
- A self-serve "delete my account and data" flow. Today that is an email to the
  address on the privacy page, handled by hand in the Supabase dashboard.
- Anything involving sending email to users (digests, reminders), team/coach dashboards,
  or server-side processing of recordings (which would break the privacy promise — don't).

---

## D. Security headers and the content security policy

All in the root `vercel.json`, applied to every path: `X-Content-Type-Options`,
`X-Frame-Options: DENY` (the app cannot be embedded in an iframe on another site),
`Referrer-Policy`, a `Permissions-Policy` that allows camera and microphone for this
origin only, and a content security policy (CSP).

**The CSP is report-only.** It blocks nothing yet; the browser logs what it would
have blocked as `[Report Only]` console lines. To enforce it, rename the header key
from `Content-Security-Policy-Report-Only` to `Content-Security-Policy`.

Rehearse locally before that, because `vite preview` applies none of these headers:

```bash
cd client && npm run build && cd ..
node scripts/serve-prod.mjs             # report-only, http://127.0.0.1:4789
node scripts/serve-prod.mjs --enforce   # blocking,    http://127.0.0.1:4790
```

State as of October 2026: an uploaded take transcribes correctly with the policy
enforced (model download, WASM, inference). The two `eval` violations from the
transformers chunk are expected and harmless: a guarded Node-only `require` lookup
in protobufjs. Not yet exercised under enforcement: a camera take with eye contact,
and Supabase sign-in.

Three things in the policy are tied to code and have to move with it:

| In the policy | Tied to | Symptom if stale (once enforced) |
|---|---|---|
| `'sha256-…'` in `script-src` | the inline theme script in `client/index.html` | dark-mode visitors see a light flash; `serve-prod.mjs` prints the new hash on start |
| `…/@mediapipe/tasks-vision@0.10.35/wasm/` in `script-src` | `WASM_BASE` in `hooks/useEyeContact.js` | eye contact silently stops loading |
| the `*.supabase.co` host in `connect-src` | `VITE_SUPABASE_URL` | sign-in, sync, metrics and signups all fail |

A new third-party host (analytics, a font, a model CDN) needs a line in the policy
and a line on the privacy page (`components/Privacy/index.jsx`).

---

## E. Supabase settings that live only in the dashboard

Nothing in this repo can set these; check them whenever the project is created,
restored or moved.

1. **The project is running.** Free-tier projects pause after about a week without
   activity and their URL stops resolving, which takes sign-in, sync, metrics and
   signups down together while the rest of the app keeps working. Restore it from the
   dashboard. If the app is quiet for long stretches, a paid plan or a scheduled
   keep-alive request avoids the pause.
2. **`supabase/schema.sql` has been run** in the SQL editor (safe to re-run). Then
   confirm in Table Editor that `sessions`, `metrics` and `leads` each show RLS enabled.
3. **Custom SMTP** (Authentication → Emails → SMTP settings). The built-in sender is
   heavily rate-limited and meant for testing; magic-link sign-in stalls under real
   traffic without a provider such as Resend.
4. **Redirect allowlist** (Authentication → URL Configuration). Site URL
   `https://speakable-omega.vercel.app`; redirect URLs limited to that origin, plus
   `http://localhost:5173` and `http://localhost:5180` for development. No wildcards.
