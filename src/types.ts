/**
 * types.ts
 * -------------------------------------------------------------
 * The data shapes for the LID (Living in Data) Phase-1 mockup.
 *
 * These types encode the project's core invariants directly:
 *   - Measurements are append-only EVENTS. A correction or retraction
 *     is a NEW event that points back at the one it supersedes — we
 *     never overwrite an original lab value.
 *   - We store the value/unit AS REPORTED and, separately, a NORMALIZED
 *     value/unit for the engines.
 *   - Every engine run persists its exact engine version, the input
 *     snapshot it saw, and which measurement events fed it.
 *
 * Types don't run at runtime — they just let the editor catch mistakes.
 */

/** Biological sex at birth (context an assay/interval may depend on). */
export type Sex = 'female' | 'male' | 'intersex' | 'unspecified';

/**
 * A subject — the person whose data we track. In the real system this
 * lives in `lid_user` (subject-specific), separate from global knowledge.
 */
export type Subject = {
  id: string;
  /** Display name / label. */
  name: string;
  /** Year of birth only in the mockup (we don't manufacture ages elsewhere). */
  birthYear?: number;
  sex: Sex;
  createdAt: number;
};

/**
 * The kind of measurement event. Everything is append-only:
 *   - `original`    a measured value entered for the first time
 *   - `correction`  fixes a data-entry error in a prior event (new row)
 *   - `retraction`  withdraws a prior event (e.g. wrong subject) (new row)
 */
export type EventType = 'original' | 'correction' | 'retraction';

/**
 * One measurement EVENT. Append-only: to change history you add another
 * event that references `supersedesEventId`. The original always remains.
 */
export type MeasurementEvent = {
  id: string;
  subjectId: string;
  /** Which parameter this measures, e.g. 'apob' — see parameters.ts. */
  parameterKey: string;

  eventType: EventType;
  /** For correction/retraction: the event id this one supersedes. */
  supersedesEventId?: string;

  /** The value exactly as reported on the lab document. */
  reportedValue: number;
  reportedUnit: string;

  /** The value normalized to the parameter's canonical unit (for engines). */
  normalizedValue: number;
  normalizedUnit: string;

  /** Assay / method / context — part of the measurement, not metadata. */
  method?: string;
  /** When the sample was drawn (ISO date string). */
  sampleDate: string;
  /** When this event was entered into LID (ms since 1970). */
  enteredAt: number;
  /** Free-text note (reason for a correction/retraction, etc.). */
  note?: string;
};

/**
 * The outcome band an engine can assign. `unknown` is a first-class,
 * legitimate result when evidence is missing.
 */
export type ResultBand = 'optimal' | 'ok' | 'watch' | 'high' | 'unknown';

/**
 * A persisted engine evaluation. We record the engine identity + version,
 * the exact input snapshot, and the source events — so a result is always
 * reproducible and auditable.
 */
export type EngineEvaluation = {
  id: string;
  subjectId: string;

  engineName: string;
  engineVersion: string;

  /** The normalized inputs the engine actually saw. */
  inputSnapshot: Record<string, number | string | null>;
  /** The measurement event ids that fed this run. */
  sourceEventIds: string[];

  band: ResultBand;
  /** The headline figure, e.g. ApoB in mg/dL (null when unknown). */
  primaryValue: number | null;
  primaryUnit: string | null;
  /** Human-readable interpretation produced by the engine. */
  interpretation: string;

  createdAt: number;
};

/**
 * A parameter definition — GLOBAL knowledge (same for every subject).
 * In the real system this lives in `lid_knowledge` and is never
 * duplicated per user. See parameters.ts for the seeded set.
 *
 * The four thresholds below are deliberately distinct — a core LID
 * invariant: reference interval ≠ diagnostic threshold ≠ guideline
 * target ≠ longevity target.
 */
export type ParameterDef = {
  key: string;
  name: string;
  family: string;
  canonicalUnit: string;
  /** Units we accept on entry and how to convert them to canonical. */
  acceptedUnits: { unit: string; toCanonical: (v: number) => number }[];
  /** Population reference interval (what a lab flags), [low, high]. */
  referenceInterval?: [number | null, number | null];
  /** Guideline treatment target (clinical), a single ceiling. */
  guidelineTarget?: number;
  /** Longevity-oriented target (lower, aspirational). */
  longevityTarget?: number;
  /** Short note on why these differ. */
  interpretationNote?: string;
};
