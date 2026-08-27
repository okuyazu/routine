/**
 * seed.ts
 * -------------------------------------------------------------
 * Placeholder demo data so the mockup shows the whole experience on
 * first launch — no backend or lab import required. (Mirrors how a
 * good prototype ships with built-in content.)
 *
 * The demo subject deliberately includes an append-only story:
 *   - an original ApoB entered with a typo,
 *   - a CORRECTION event that supersedes it (the original is kept),
 *   - a couple of other lipid parameters,
 *   - one RETRACTED measurement (wrong subject) that stays on record.
 */

import { MeasurementEvent, Subject } from './types';

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

export const DEMO_SUBJECT: Subject = {
  id: 'subj-demo',
  name: 'Demo Subject',
  birthYear: 1985,
  sex: 'unspecified',
  createdAt: now - 40 * DAY,
};

export const DEMO_MEASUREMENTS: MeasurementEvent[] = [
  // ApoB — original entered with a data-entry error (108 -> should be 102).
  {
    id: 'evt-apob-1',
    subjectId: 'subj-demo',
    parameterKey: 'apob',
    eventType: 'original',
    reportedValue: 108,
    reportedUnit: 'mg/dL',
    normalizedValue: 108,
    normalizedUnit: 'mg/dL',
    method: 'Immunoturbidimetric',
    sampleDate: '2026-06-02',
    enteredAt: now - 30 * DAY,
    note: 'Entered from paper report.',
  },
  // ApoB — CORRECTION: supersedes the typo above. Original is NOT deleted.
  {
    id: 'evt-apob-2',
    subjectId: 'subj-demo',
    parameterKey: 'apob',
    eventType: 'correction',
    supersedesEventId: 'evt-apob-1',
    reportedValue: 102,
    reportedUnit: 'mg/dL',
    normalizedValue: 102,
    normalizedUnit: 'mg/dL',
    method: 'Immunoturbidimetric',
    sampleDate: '2026-06-02',
    enteredAt: now - 12 * DAY,
    note: 'Corrected transcription error (108 → 102).',
  },
  // LDL-C entered in mmol/L, normalized to mg/dL.
  {
    id: 'evt-ldl-1',
    subjectId: 'subj-demo',
    parameterKey: 'ldl_c',
    eventType: 'original',
    reportedValue: 2.9,
    reportedUnit: 'mmol/L',
    normalizedValue: 112.1,
    normalizedUnit: 'mg/dL',
    method: 'Calculated (Friedewald)',
    sampleDate: '2026-06-02',
    enteredAt: now - 30 * DAY,
  },
  // HDL-C.
  {
    id: 'evt-hdl-1',
    subjectId: 'subj-demo',
    parameterKey: 'hdl_c',
    eventType: 'original',
    reportedValue: 55,
    reportedUnit: 'mg/dL',
    normalizedValue: 55,
    normalizedUnit: 'mg/dL',
    sampleDate: '2026-06-02',
    enteredAt: now - 30 * DAY,
  },
  // Triglycerides — original then RETRACTED (was the wrong subject's row).
  {
    id: 'evt-trig-1',
    subjectId: 'subj-demo',
    parameterKey: 'triglycerides',
    eventType: 'original',
    reportedValue: 320,
    reportedUnit: 'mg/dL',
    normalizedValue: 320,
    normalizedUnit: 'mg/dL',
    sampleDate: '2026-06-02',
    enteredAt: now - 30 * DAY,
  },
  {
    id: 'evt-trig-2',
    subjectId: 'subj-demo',
    parameterKey: 'triglycerides',
    eventType: 'retraction',
    supersedesEventId: 'evt-trig-1',
    reportedValue: 320,
    reportedUnit: 'mg/dL',
    normalizedValue: 320,
    normalizedUnit: 'mg/dL',
    sampleDate: '2026-06-02',
    enteredAt: now - 20 * DAY,
    note: 'Retracted — value belonged to a different subject.',
  },
];
