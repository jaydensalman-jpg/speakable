# Deploying Speakable

The app is a fully static React (Vite) build — `client/dist` can be hosted anywhere.
It is live today at **https://speakable-omega.vercel.app** on the Vercel project
`speakable`, deployed manually from this folder. This doc covers (A) the current
manual deploy, (B) upgrading to continuous deployment from GitHub so every push
auto-updates the live site for all users, and (C) what runs client-side vs. what
needs a backend.

---

## A. Manual deploy (works today)

```bash
cd client
npx vercel deploy --prod --yes
```

That's it — Vercel builds with `npm run build` (see `client/vercel.json`) and swaps
the live site. Use this until the GitHub flow below is set up.

## B. Continuous deployment (recommended before distributing)

Goal: `git push` → Vercel builds → live site updates for everyone, automatically.

### One-time setup

1. **Create the GitHub repo** (this folder is already a git repo):
   ```bash
   # from speaking-coach/
   gh repo create speakable --public --source . --push
   # or: create an empty repo on github.com, then
   # git remote add origin https://github.com/<you>/speakable.git && git push -u origin main
   ```
   Commit everything first (`git add -A && git commit -m "..."`). Secrets are safe:
   `client/.gitignore` excludes `.env*` and `.vercel`.

2. **Connect Vercel to the repo** — in the Vercel dashboard:
   - Project `speakable` → **Settings → Git** → **Connect Git Repository** → pick the repo.
   - **Settings → General → Root Directory**: set to `client` (the repo root is the
     project folder; the app lives in `client/`).
   - Build settings are auto-detected from `client/vercel.json` (Vite, `npm run build`, `dist`).

3. **Environment variables** — already set on the project (`VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY` for Production). If you ever recreate the project, re-add
   them under **Settings → Environment Variables**. They are baked in at build time,
   so changing them requires a redeploy.

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
  Worst case a user sees the old version for one session; the next open is current.
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

Would need NEW backend work (flagged, not built):
- **Email-gate leads**: the pre-recording email capture stores to localStorage only
  (`speakable-email`). To actually collect these, POST them somewhere — simplest is a
  Supabase `leads` table (insert-only RLS policy) or a Vercel serverless function.
- Anything involving sending email to users (digests, reminders), team/coach dashboards,
  or server-side processing of recordings (which would break the privacy promise — don't).
