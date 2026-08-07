# My Benchmarks 📊

A personal benchmark tracker for **any** goal — fitness, savings, a hobby, a
project. It installs as an app on your phone, shows milestones and progress, and
every project is a plain Markdown note you can edit by hand, in Obsidian, or with
an AI. No backend, no accounts, no cost.

- ✅ **Checkmarks on your phone** — tap milestones and tasks, saved instantly (works offline)
- 🎯 **Milestones, progress bars & trends** — dated timelines, sparklines, an overview dashboard
- 💵 **Budgets** — categorize spending from a bank CSV against monthly budgets
- 🤖 **LLM-friendly** — create or edit projects with Claude/ChatGPT, or right in the app
- 🗂️ **Obsidian vault** — `projects/` and `inbox/` are plain `.md` notes: same files, two views
- 📦 **Zero dependencies** — plain HTML/CSS/JS, no build step, no backend

---

## 🚀 Get your own copy

This repo is a **template** — everyone runs their own private copy, with their
own data, on free hosting. To set one up:

1. **Use this template** → click **“Use this template” → Create a new repository**
   on GitHub (or fork it).
2. **Turn on hosting** → in your new repo: **Settings → Pages → Source: Deploy
   from a branch → `main` / `/ (root)` → Save**.
3. **Open your app** at `https://<your-username>.github.io/<repo>/` and
   **Add to Home screen**.
4. *(Optional)* To create/edit projects from your phone, tap **➕ New project →
   GitHub connection** and paste a fine-grained token (see
   [From inside the app](#from-inside-the-app)).

**Make it yours:** the app name and tagline come from
[`data/manifest.json`](data/manifest.json) (`app` and `tagline`). The starter
ships with one **Example Goal** and a **Monthly Budget** — edit or delete them
and add your own.

---

## Add it to your Android phone

1. Open the published site in **Chrome** on your phone.
2. Tap the **⋮ menu → "Add to Home screen"** (or "Install app").
3. It now launches full-screen like a native app and works offline.

*(On iPhone: Safari → Share → "Add to Home Screen".)*

---

## How your progress is saved

Your taps are stored **on your device** (localStorage) and layered on top of the
project files — so the app always works instantly and offline, with no login.

To make progress **permanent** or **sync it across devices**, tap the **⟳ sync**
button (top-right), copy the snapshot, and paste it to Claude or ChatGPT with:

> "Tick the checkboxes in my `projects/*.md` files to match this snapshot."

Commit the change and every device sees it.

---

## Adding a new project (or ask an AI to)

Each project is one Markdown note in [`projects/`](projects/) — the same file
opens in Obsidian. Create `projects/My Project.md`:

```markdown
---
id: myproject
title: My Project
emoji: 🚀
color: "#7c3aed"
target: 2026-12-31
---

What this project is about.

## Progress
- Something measurable: 0 / 12 / 50 km

## Milestones
- [ ] First milestone 📅 2026-08-01

## Checklist
- [ ] A repeating task (weekly)
```

Then add the file path to the `projects` list in [`data/manifest.json`](data/manifest.json):

```json
{ "projects": ["projects/Hyrox Training.md", "projects/My Project.md"] }
```

**Prompt you can paste to Claude/ChatGPT:**

> "In this repo, add a new benchmark project for `<your goal>`. Create a Markdown
> note in `projects/` following the format in the README, with realistic metrics,
> dated milestones, and a checklist, then add its path to `data/manifest.json`."

### From inside the app

Tap **＋ New project** on the home screen. The first time, tap **GitHub
connection** and paste a **fine-grained token** (Settings → Developer settings →
Fine-grained tokens; scope it to *only this repo* with **Contents: Read and
write**). The token is stored **only on your device**, never in the app or repo,
and you can remove or revoke it anytime. Fill in the form and the app commits the
note for you; it shows up after GitHub republishes (~1 min).

### Format reference

| Part | Meaning |
|------|---------|
| **Frontmatter** (between `---`) | `id` (keep stable — checkmarks key off it), `title`, `emoji`, `color` (any hex), `target` (`YYYY-MM-DD`). Obsidian reads these as note properties. |
| **Description** | The text right after the frontmatter, before the first `##`. |
| `## Progress` | One line per metric: `- Label: start / current / target unit`. Smaller-is-better (debt, run time) just works — put the bigger number as `start`. `$` as the unit renders as currency. |
| `## Milestones` | Task lines `- [ ] Title 📅 YYYY-MM-DD`. `- [x]` = done. Shown as a dated timeline. |
| `## Checklist` | Task lines `- [ ] Title (cadence)`, cadence being daily/weekly/monthly/once. Add a **weekly quota** with `×N`: `- [ ] Runs (weekly ×3)` shows **n/3**, you tap it each time you do one, and it **resets every week** (no fixed day). Works with `daily ×N` and `monthly ×N` too. Recurring items track per-period on your device. |

Checkbox state (`- [ ]` vs `- [x]`) is the committed value; your local taps
override it until you sync. Overall project % averages your milestone,
checklist, and metric progress.

> **Obsidian tip:** open the repository folder as a vault. The frontmatter shows
> up as note properties, and with the community **Tasks** plugin the `📅` due
> dates on milestones are recognised automatically.

---

## Publishing (GitHub Pages)

This is a plain static site, so it's served directly from the branch — no build
step. **One-time setup:** in your repo, go to **Settings → Pages → Build and
deployment → Source: Deploy from a branch**, then choose **`main`** and folder
**`/ (root)`**, and Save. Your app will be live at
`https://<username>.github.io/<repo>/`, and every push republishes it.

The committed icons and the `.nojekyll` marker (which tells Pages to serve files
as-is) mean everything works without any workflow.

---

## Idea Inbox → Projects

A place to capture the important conclusions from long AI conversations before
they're ready to be real projects. Ideas are Markdown notes in
[`inbox/`](inbox/) (frontmatter `status: idea | promoted`, a `#` title, `##
Notes`, `## Next steps`), listed under `inbox` in the manifest, and show up under
the **💡 Idea Inbox** (top-right), separate from tracked projects. When an idea
is ripe, **promote** it into a full project with milestones.

**Capture (the easy way):** copy anything from an AI chat — a summary, a few
bullet points, plain prose — then in the Inbox tap **📋 Paste idea from
clipboard**. On Android you can skip the copy step: select the text in the
ChatGPT/Claude app and **Share → My Benchmarks**. Either way it lands in your
Inbox instantly, saved on the phone (marked "on this phone"). Tap **Save … to
repo** to turn a batch into `inbox/*.md` notes so they sync across devices.

Captures don't need any special format — the first line becomes the title. If
you *do* want structured output, tap **Get a capture prompt for AI**; it returns
a JSON idea block like this:

```json
{
  "id": "idea_myslug",
  "title": "Short name",
  "captured": "2026-08-04",
  "summary": "One sentence on what this is.",
  "notes": "Distilled points, short lines separated by \n",
  "nextSteps": ["...", "..."],
  "source": "where it came from",
  "status": "idea"
}
```

**Promote:** open an idea and tap **Copy "promote" prompt**, then paste it to
Claude/ChatGPT on this repo. It creates the project file (with metrics and
milestones), adds it to `data/manifest.json`, and flips the idea's `status` to
`"promoted"`.

## Import a bank statement (CSV)

Open a project → **⭳ Import CSV** → pick a statement file (e.g. exported from
K PLUS). It's parsed **on your device — nothing is uploaded**. The app
auto-detects the amount column (you can change it), shows money out / money in /
transaction count, and lets you apply one of those figures to a project metric.
Requires the GitHub connection (same token as creating projects), since it saves
the number into the project note.

### Budget projects (categories + monthly trends)

A project with `budget: true` in its frontmatter becomes a **monthly budget**.
Its `## Progress` metrics are **categories** (`current` = spent this month,
`target` = the budget), and a `## Rules` section maps keywords to categories:

```markdown
## Progress
- Food: 0 / 0 / 6000 ฿
- Transport: 0 / 0 / 3000 ฿

## Rules
- Food: 7-eleven, grocery, restaurant, coffee
- Transport: grab, taxi, fuel, bts
```

Importing a statement into a budget project reads each transaction's
description, sorts spending into categories, fills in **every category at
once**, flags **over-budget** in red, and appends the month's totals to the
`## History` table so you get category trends over time. Unmatched spending
falls into a `Other` category. The starter **Monthly Budget** project ships
with sensible categories and rules — edit them with **✎ Edit note**.

## Automatic sync from Garmin (optional)

A scheduled GitHub Action ([`.github/workflows/garmin-sync.yml`](.github/workflows/garmin-sync.yml))
pulls your recent Garmin Connect runs each morning and updates the Hyrox
project's **weekly training volume** and **best-5K** metrics, then commits so
the live app reflects real data.

**One-time setup:**

1. On your own computer, mint a login token (handles MFA, keeps your password
   off GitHub):
   ```bash
   pip install garth
   python scripts/garmin_login.py
   ```
2. Copy the printed token into a repository secret named **`GARMIN_TOKEN`**
   (Settings → Secrets and variables → Actions → New repository secret).
3. Trigger it once to test: **Actions → Garmin sync → Run workflow**.

It then runs daily (edit the `cron` to change the time — it's in UTC). Which
Garmin numbers map to which metrics is controlled by `SYNCED_METRICS` in
[`scripts/garmin_sync.py`](scripts/garmin_sync.py).

> Garmin has no official API for individuals, so this uses the unofficial,
> community-maintained `garth` client. If Garmin changes their login it may
> need updating. Your credentials live only in the token secret, never in the code.

## Run locally

It's a static site — serve the folder with any web server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Regenerate app icons after changing the design: `node scripts/gen-icons.js`.
