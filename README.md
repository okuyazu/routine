# My Benchmarks 📊

A personal benchmark tracker for **any** goal you can think of — Hyrox training,
financial goals, 3D printing projects, and more. It runs as an installable app on
your Android phone, shows milestones and progress, and is designed to be edited
with **Claude or ChatGPT**.

- ✅ **Checkmarks on your phone** — tap milestones and tasks, saved instantly (works offline)
- 🎯 **Milestones & progress** — dated timelines and progress bars per project
- 🌐 **View anywhere** — website (GitHub Pages) or your phone, same app
- 🤖 **LLM-friendly** — every project is a small JSON file an AI can read and edit
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

> "Update the `done` fields in my `data/*.json` files to match this snapshot."

Commit the change and every device sees it.

---

## Adding a new project (or ask an AI to)

Each project is one file in [`data/`](data/). Create `data/myproject.json`:

```json
{
  "id": "myproject",
  "title": "My Project",
  "emoji": "🚀",
  "color": "#7c3aed",
  "description": "What this is about.",
  "targetDate": "2026-12-31",
  "metrics": [
    { "id": "m1", "label": "Something measurable", "unit": "km", "start": 0, "current": 12, "target": 50 }
  ],
  "milestones": [
    { "id": "ms1", "title": "First milestone", "target": "2026-08-01", "done": false }
  ],
  "checklist": [
    { "id": "c1", "title": "A repeating task", "cadence": "weekly", "done": false }
  ]
}
```

Then add the filename to [`data/manifest.json`](data/manifest.json):

```json
{ "projects": ["hyrox.json", "finance.json", "printing.json", "myproject.json"] }
```

**Prompt you can paste to Claude/ChatGPT:**

> "In this repo, add a new benchmark project for `<your goal>`. Create a JSON file
> in `data/` following the schema in the README, with realistic metrics, dated
> milestones, and a checklist, then add it to `data/manifest.json`."

### Field reference

| Field | Where | Meaning |
|-------|-------|---------|
| `id` | project & items | Unique short id. Keep stable — your saved checkmarks are keyed to it. |
| `emoji`, `color` | project | Icon and accent color (any hex). |
| `targetDate` | project | Overall goal date (`YYYY-MM-DD`). |
| `metrics[]` | project | Numeric progress bar: `start → current → target`. Add `"lowerIsBetter": true` when smaller is the goal (e.g. debt, run time). `unit: "$"` renders as currency. |
| `milestones[]` | project | Dated, checkable achievements shown as a timeline. |
| `checklist[]` | project | Checkable tasks/habits. Optional `cadence` label (daily/weekly/monthly/once). |
| `done` | milestone/checklist | The committed state in the file. Your local taps override it until you sync. |

Overall project % is the average of your milestone, checklist, and metric progress.

---

## Publishing (GitHub Pages)

A workflow at [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
publishes the site on every push. **One-time setup:** in your repo, go to
**Settings → Pages → Build and deployment → Source: GitHub Actions**. Your app
will be live at `https://<username>.github.io/<repo>/`.

---

## Run locally

It's a static site — serve the folder with any web server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Regenerate app icons after changing the design: `node scripts/gen-icons.js`.
