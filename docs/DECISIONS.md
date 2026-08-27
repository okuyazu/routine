# Architecture decisions

## ADR-001 — This deliverable is a front-end mockup, not the Phase-1 backend

**Context.** `AGENTS.md` scopes Phase 1 as a backend-first vertical slice
(Postgres, FastAPI, the supplied Python lipid engine, tests). The request here
was to "create a mockup for the Longevity App," and the repository was an Expo /
React Native starter.

**Decision.** Build the mockup *into the existing Expo app* as the Phase-1
"Current State" experience, using local-only state and a deterministic
TypeScript engine stub that mirrors the real contracts. Do not implement the
database, RLS, or the real Python engine here.

**Consequences.** The UI can be felt end-to-end today with no backend. When the
tested backend exists, screens swap their data source (`LidContext` / `storage`)
for API calls with minimal churn; the type shapes were chosen to match the API
contracts.

## ADR-002 — Measurements are modeled as append-only events

`MeasurementEvent` carries an `eventType` (`original` / `correction` /
`retraction`) and an optional `supersedesEventId`. Corrections and retractions
add new rows; nothing is mutated in place. `LidContext.effectiveEvents()`
resolves the chain into the set that currently "counts" (latest correction wins,
retracted values drop out) — which is exactly what feeds the engine. This keeps
the mockup honest about provenance.

## ADR-003 — Reported and normalized values are stored separately

Each event keeps `reportedValue`/`reportedUnit` (as on the lab document) and
`normalizedValue`/`normalizedUnit` (canonical unit for engines). Unit conversion
lives with the parameter definition in `parameters.ts`. Engines only ever read
normalized values.

## ADR-004 — Engine runs are deterministic and versioned

`engine.ts` exposes a pure `runLipidEngine(input)` plus `ENGINE_NAME` /
`ENGINE_VERSION`. Every run persists the engine identity, the input snapshot, and
the source event ids on the `EngineEvaluation`, so any result is reproducible and
auditable. Missing ApoB yields an explicit `unknown` band.

## ADR-005 — Thresholds are layered, never a single "normal/abnormal"

`ParameterDef` distinguishes `referenceInterval`, `guidelineTarget`, and
`longevityTarget`. The lipid result screen renders these as separate zones so
"in reference range" is visibly not the same as "at target." Threshold numbers
are placeholders for the mockup, not clinical guidance.
