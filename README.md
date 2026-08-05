# My Benchmarks 📊

A personal benchmark tracker for **any** goal you can think of — Hyrox training,
financial goals, 3D printing projects, and more. It runs as an installable app on
your Android phone, shows milestones and progress, and is designed to be edited
with **Claude or ChatGPT**.

- ✅ **Checkmarks on your phone** — tap milestones and tasks, saved instantly (works offline)
- 🎯 **Milestones & progress** — dated timelines and progress bars per project
- 🌐 **View anywhere** — website (GitHub Pages) or your phone, same app
- 🤖 **LLM-friendly** — every project is a Markdown note an AI can read and edit
- 🗂️ **Obsidian vault** — the `projects/` and `inbox/` folders are plain `.md` notes you can open in [Obsidian](https://obsidian.md) on your desktop and track on your phone — same files, two views
- 📦 **Zero dependencies** — plain HTML/CSS/JS, no build step, no backend

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
| `## Checklist` | Task lines `- [ ] Title (cadence)`, cadence being daily/weekly/monthly/once. |

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
