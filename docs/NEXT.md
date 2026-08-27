# Next milestone

The mockup covers the Phase-1 **UI** slice. The scientific core still needs to be
built and tested per `AGENTS.md`. Recommended next task, in order:

## 1. Stand up the real Phase-1 backend (separate from this mockup)

Following `reference/` contracts (note: those spec files are not present in this
repo snapshot and must be supplied):

- PostgreSQL boots from the supplied migrations.
- Non-owner application role; row-level security preserved.
- Endpoints: create subject; insert measurement (append-only); load ApoB and run
  the supplied `lid_lipid_engine_v0_1.py`; persist the exact engine input/output
  and version.

Report these tests (do not suppress failures):
migration/bootstrap · subject creation · measurement insert · correction /
retraction append-only · cross-subject RLS isolation · ApoB engine unit ·
end-to-end DB → engine → persisted evaluation → API.

## 2. Point this app at the backend

- Replace `src/storage.ts` (device storage) with an API client.
- Replace the `engine.ts` stub call with the persisted evaluation returned by the
  backend; keep the same `EngineEvaluation` shape.
- Move parameter definitions / thresholds from `parameters.ts` to values served
  from `lid_knowledge` (global, never per-user).

## 3. Only then, widen scope

Biological-age, lifespan, supplements, PDF extraction, AI chat, and the full
six-family UI remain explicitly **out of scope** until Phase 1 is complete and
tested. Do not advance phases automatically.

## Known gaps in the mockup

- Thresholds in `parameters.ts` are illustrative, not clinical.
- Sample dates are entered as free text (`YYYY-MM-DD`); a real build should use a
  date picker and validate assay/method against a controlled vocabulary.
- No automated test suite in the mockup — validated via `tsc --noEmit` and an
  `expo export` web-bundle smoke test. Unit tests belong with the backend engine.
