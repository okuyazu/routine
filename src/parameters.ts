/**
 * parameters.ts
 * -------------------------------------------------------------
 * GLOBAL knowledge: the parameter definitions LID knows about.
 *
 * In the production system these live in `lid_knowledge` / `lid_evidence`
 * and are shared by every subject — never duplicated per user. This file
 * is the mockup's stand-in for that global catalogue.
 *
 * Phase 1 focuses on the LIPID family, and specifically ApoB, which is the
 * parameter the supplied Lipid engine consumes.
 *
 * ⚠️ The threshold numbers here are ILLUSTRATIVE placeholders for a UI
 * mockup, not clinical advice. They exist to demonstrate a core LID
 * invariant: reference interval ≠ guideline target ≠ longevity target.
 */

import { ParameterDef } from './types';

/** mg/dL <-> mmol/L conversions for the cholesterol parameters. */
const MGDL_PER_MMOL_CHOL = 38.67; // total/LDL/HDL cholesterol
const MGDL_PER_MMOL_TRIG = 88.57; // triglycerides

export const PARAMETERS: ParameterDef[] = [
  {
    key: 'apob',
    name: 'Apolipoprotein B (ApoB)',
    family: 'Lipid',
    canonicalUnit: 'mg/dL',
    acceptedUnits: [
      { unit: 'mg/dL', toCanonical: (v) => v },
      { unit: 'g/L', toCanonical: (v) => v * 100 }, // 1 g/L = 100 mg/dL
    ],
    referenceInterval: [40, 125],
    guidelineTarget: 90,
    longevityTarget: 60,
    interpretationNote:
      'The lab reference interval (population range) is far higher than the ' +
      'guideline target, which is in turn higher than a longevity-oriented ' +
      'target. Being "in range" is not the same as being "at target".',
  },
  {
    key: 'ldl_c',
    name: 'LDL cholesterol',
    family: 'Lipid',
    canonicalUnit: 'mg/dL',
    acceptedUnits: [
      { unit: 'mg/dL', toCanonical: (v) => v },
      { unit: 'mmol/L', toCanonical: (v) => v * MGDL_PER_MMOL_CHOL },
    ],
    referenceInterval: [0, 130],
    guidelineTarget: 100,
    longevityTarget: 70,
  },
  {
    key: 'hdl_c',
    name: 'HDL cholesterol',
    family: 'Lipid',
    canonicalUnit: 'mg/dL',
    acceptedUnits: [
      { unit: 'mg/dL', toCanonical: (v) => v },
      { unit: 'mmol/L', toCanonical: (v) => v * MGDL_PER_MMOL_CHOL },
    ],
    referenceInterval: [40, null],
  },
  {
    key: 'triglycerides',
    name: 'Triglycerides',
    family: 'Lipid',
    canonicalUnit: 'mg/dL',
    acceptedUnits: [
      { unit: 'mg/dL', toCanonical: (v) => v },
      { unit: 'mmol/L', toCanonical: (v) => v * MGDL_PER_MMOL_TRIG },
    ],
    referenceInterval: [0, 150],
    guidelineTarget: 100,
  },
  {
    key: 'lp_a',
    name: 'Lipoprotein(a)',
    family: 'Lipid',
    canonicalUnit: 'nmol/L',
    acceptedUnits: [{ unit: 'nmol/L', toCanonical: (v) => v }],
    referenceInterval: [0, 75],
  },
];

/** Look up a parameter definition by its key. */
export function getParameter(key: string): ParameterDef | undefined {
  return PARAMETERS.find((p) => p.key === key);
}

/** All parameter keys in a stable order (ApoB first — Phase-1 focus). */
export function parameterKeys(): string[] {
  return PARAMETERS.map((p) => p.key);
}
