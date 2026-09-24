# Project status & handoff

A quick orientation for any future session (or a new machine). This file is just
notes — it doesn't affect the app.

_Last updated: 2026-09-24_

## What this is
**My Benchmarks** — a personal, local-first PWA for tracking goals: projects with
milestones, progress bars, and weekly/daily quota checklists (streaks + history).
Plus a separate **Money** finance app under `/finance/`. Plain HTML/CSS/JS, no
build step, no backend.

## Where it lives
- **Repo:** `okuyazu/routine`
- **Live app:** https://okuyazu.github.io/routine/ (Money app at `/finance/`)
- **Branch:** everything ships from **`main`** (now the repo's default branch).
  GitHub Pages deploys `main` on every push. Other `claude/*` branches are
  unrelated experiments — ignore them.
- **Version:** single source of truth is `VERSION` in `sw.js`. Bump it on every
  deploy so devices pick up the change (auto-reload on `controllerchange`).

## How data works (important)
- **Local-first:** taps/tallies are stored on each device (IndexedDB via
  `store.js`), layered over the served files. The app runs with **no GitHub
  login**.
- **Projects you create on your phone live only on that device** — they are not
  in the repo (`data/manifest.json` ships empty on purpose, for a clean install).
- **Sync between devices:** in-app **⟳ → Backup & sync → Export vault** on one
  device, **Import vault** on the other. (Or paste a GitHub token to sync via the
  repo.)

## Done
- Local-first storage, offline export/import sync.
- Weekly/daily quota tallies, streaks + history, over-achievement %.
- Milestone auto-check from weekly/monthly streaks.
- AI-paste note recovery, visible Delete button, install helper.
- Money (finance) app with screenshot/OCR import + reports.
- Android APK (TWA) + Linux AppImage delivered previously; Digital Asset Links
  set up so the Android app runs full-screen.
- **Progress bars link to matching checklist quotas** (v30, 2026-09-24) — a
  metric mirrors the recurring quota whose target + unit match it.

## Pending / paused
- **Garmin auto-sync** — code is complete (`scripts/garmin_sync.py`,
  `.github/workflows/garmin-sync.yml`, app reads `data/garmin.json`), but the
  scheduled job needs one secret to start working:
  1. Generate a token locally: `pip install garth==0.8.0` then
     `python3 scripts/garmin_login.py` (handles MFA, prints a token).
  2. Add it as repo secret **`GARMIN_TOKEN`** (Settings → Secrets and variables
     → Actions).
  3. Trigger the workflow once (Actions tab → "Garmin sync" → Run workflow).
  Then a weekly/monthly km "sum" quota whose title mentions "run" auto-fills.
  _Paused by user — will do later._
- **Strava Connect** — code is complete (in-app OAuth button +
  `worker/strava-worker.js` Cloudflare Worker holding the client secret). Needs
  `data/connections.json` filled with the real `clientId` and `backendUrl`
  (currently empty placeholders). _Awaiting user's Client ID + Worker URL._
- **Optional cleanup offered:** loosen the "Adjust wall-ball & kettlebell volume"
  weekly item so it stops gating the milestone streak.

## Continuing on a new machine
Start a fresh Claude Code session pointed at `okuyazu/routine`. The chat history
doesn't travel, but all code + this note do. Personal app data moves via the
in-app Export/Import vault.

## Secrets — never commit these
GitHub token, Garmin token, Strava client secret. The Strava secret lives **only**
in the Cloudflare Worker. Bank/financial numbers in this public repo are publicly
visible.
