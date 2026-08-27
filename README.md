# LID — Living in Data (Longevity App mockup)

A UI **mockup** for LID, a longitudinal, evidence-versioned
health-intelligence app. This is the **Phase-1 "Current State" slice**: create a
subject, enter numeric lab measurements, and see the ApoB / lipid engine result
with the source measurements behind it.

Built with **React Native + Expo** (one codebase runs on iOS, Android, and web).

> **Status:** a front-end mockup with built-in demo data — no backend, no API
> keys. Everything is stored locally on the device. The deterministic engine and
> data model are stubs that mirror the real LID contracts so the UI can be felt
> end-to-end.

## What this mockup demonstrates

It is deliberately faithful to LID's scientific and data invariants:

- **Append-only measurements.** A correction or retraction is a *new event* that
  supersedes an earlier one — the original is never overwritten or deleted. See
  the measurement history screen.
- **Reported vs normalized values are stored separately.** Enter LDL-C in mmol/L
  and the engine still sees mg/dL; both are kept.
- **Reproducible engine runs.** Each evaluation persists the engine name, exact
  version, the input snapshot it saw, and the source event ids.
- **UNKNOWN is a legitimate result.** With no ApoB on record the engine returns
  UNKNOWN rather than guessing.
- **Distinct thresholds, never conflated.** Reference interval ≠ guideline target
  ≠ longevity target — shown as separate layers on the result scale.
- **No scoreboard.** No global longevity score, no biological-age number, no
  lifespan estimate.

> ⚠️ The threshold numbers in `src/parameters.ts` are illustrative placeholders
> for a UI mockup, **not clinical advice**.

## Run it

You do **not** need Xcode or Android Studio.

1. Install [Node.js](https://nodejs.org) (v18+).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start it:
   ```bash
   npx expo start        # scan the QR code with Expo Go
   npx expo start --web  # or open it in a browser
   ```

## How the project is organized

```
App.tsx                     Entry point: navigation + <LidProvider>
app.json                    App name, icon, configuration

src/
  types.ts                  Data shapes (Subject, MeasurementEvent, EngineEvaluation…)
  parameters.ts             GLOBAL knowledge: parameter defs + thresholds (ApoB, LDL-C…)
  engine.ts                 ⭐ Deterministic lipid engine (stub for lid_lipid_engine)
  LidContext.tsx            Single source of truth: subjects, append-only events, runs
  storage.ts                On-device persistence (AsyncStorage)
  seed.ts                   Built-in demo subject + measurements (incl. a correction)
  ui.ts / theme.ts          Presentation helpers and the restyle-in-one-file theme
  navigation.ts             The list of screens and what data each needs

screens/
  HomeScreen.tsx              Current State dashboard (the Phase-1 output)
  CreateSubjectScreen.tsx     Create / switch subjects
  AddMeasurementScreen.tsx    Enter a numeric lab value (reported → normalized)
  LipidResultScreen.tsx       The persisted engine evaluation, in full
  MeasurementHistoryScreen.tsx Append-only event log with correct / retract
```

## The core loop

```
Add measurement  →  append-only `original` event      (LidContext)
                 →  saved to the device                 (storage.ts)
Run lipid engine →  latest effective ApoB → runLipidEngine()  (engine.ts)
                 →  evaluation persisted with version + snapshot
                 →  shown on the Current State + Lipid result screens
```

## What this mockup is NOT

Per `AGENTS.md`, Phase 1 is a thin slice. This mockup intentionally omits PDF
extraction, AI chat, biological age, lifespan prediction, supplement
recommendations, and the full six-family UI. The real scientific core (Postgres
migrations, RLS, the supplied Python lipid engine, API contracts) lives on the
backend and is the subject of a separate, tested Phase-1 build — see
`docs/NEXT.md`.
