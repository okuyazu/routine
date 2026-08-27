/**
 * engine.ts
 * -------------------------------------------------------------
 * A DETERMINISTIC lipid engine (mockup stand-in for the supplied
 * `lid_lipid_engine_v0_1.py`).
 *
 * The scientific core of LID is NOT an LLM. This engine is a pure
 * function of its inputs: same input snapshot + same version => same
 * output, every time. That is what makes an evaluation reproducible
 * and auditable.
 *
 * Phase-1 job: given the subject's latest effective ApoB (normalized to
 * mg/dL), classify it against the ApoB parameter's distinct thresholds
 * and return a band + interpretation. If there is no ApoB evidence, the
 * engine legitimately returns UNKNOWN — it never guesses.
 */

import { getParameter } from './parameters';
import { ResultBand } from './types';

/** The engine's identity — persisted with every evaluation. */
export const ENGINE_NAME = 'lid_lipid_engine';
export const ENGINE_VERSION = 'v0.1.0-mock';

export type LipidEngineInput = {
  /** Latest effective ApoB in mg/dL, or null if none on record. */
  apobMgDl: number | null;
};

export type LipidEngineResult = {
  band: ResultBand;
  primaryValue: number | null;
  primaryUnit: string | null;
  interpretation: string;
  /** Exactly what the engine saw — persisted as the input snapshot. */
  inputSnapshot: Record<string, number | string | null>;
};

/**
 * Classify an ApoB value. The thresholds come from the ApoB parameter
 * definition and are deliberately layered (reference vs guideline vs
 * longevity) — the engine reports which layer the value clears.
 */
export function runLipidEngine(input: LipidEngineInput): LipidEngineResult {
  const apob = getParameter('apob');
  const longevity = apob?.longevityTarget ?? 60;
  const guideline = apob?.guidelineTarget ?? 90;
  const refHigh = apob?.referenceInterval?.[1] ?? 125;

  const inputSnapshot: Record<string, number | string | null> = {
    apob_mg_dl: input.apobMgDl,
    apob_longevity_target: longevity,
    apob_guideline_target: guideline,
    apob_reference_high: refHigh,
  };

  // No evidence -> UNKNOWN is a legitimate, honest result.
  if (input.apobMgDl == null) {
    return {
      band: 'unknown',
      primaryValue: null,
      primaryUnit: null,
      interpretation:
        'No ApoB measurement on record. LID returns UNKNOWN rather than ' +
        'estimating a value — enter an ApoB result to evaluate the lipid family.',
      inputSnapshot,
    };
  }

  const v = input.apobMgDl;
  let band: ResultBand;
  let interpretation: string;

  if (v <= longevity) {
    band = 'optimal';
    interpretation =
      `ApoB ${v} mg/dL is at or below the longevity-oriented target ` +
      `(≤ ${longevity} mg/dL).`;
  } else if (v <= guideline) {
    band = 'ok';
    interpretation =
      `ApoB ${v} mg/dL is within the guideline target (≤ ${guideline} mg/dL) ` +
      `but above the longevity-oriented target (≤ ${longevity} mg/dL).`;
  } else if (v <= refHigh) {
    band = 'watch';
    interpretation =
      `ApoB ${v} mg/dL is inside the population reference interval ` +
      `(≤ ${refHigh} mg/dL) yet above the guideline target (≤ ${guideline} mg/dL). ` +
      `"In range" is not the same as "at target".`;
  } else {
    band = 'high';
    interpretation =
      `ApoB ${v} mg/dL is above the population reference interval ` +
      `(≤ ${refHigh} mg/dL).`;
  }

  return {
    band,
    primaryValue: v,
    primaryUnit: 'mg/dL',
    interpretation,
    inputSnapshot,
  };
}
