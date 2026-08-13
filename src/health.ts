/**
 * health.ts
 * -------------------------------------------------------------
 * The "brain" of the app. It turns the raw things the user logs
 * (labs, exercise, diet, sleep) into:
 *
 *   • a per-pillar score (0–100),
 *   • an overall Health Score (0–100),
 *   • an estimated life expectancy (years), and
 *   • plain-language tips.
 *
 * IMPORTANT: this is a TRANSPARENT, EDUCATIONAL heuristic — not a
 * medical device. Every number below is a deliberately simple,
 * readable rule of thumb loosely inspired by public-health
 * guidance (WHO activity targets, sleep-duration research, standard
 * lab reference ranges). It is meant to motivate healthy habits and
 * make trade-offs visible, NOT to diagnose or predict any real
 * individual's lifespan. Keep the rules here easy to read and tweak.
 */

import {
  DietEntry,
  ExerciseEntry,
  HealthData,
  LabEntry,
  LabMarkerId,
  Profile,
  SleepEntry,
} from './types';

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const round1 = (n: number) => Math.round(n * 10) / 10;
const avg = (nums: number[]) =>
  nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;

/** Entries within the last `days` days (based on the 'YYYY-MM-DD' date). */
function recent<T extends { date: string }>(entries: T[], days: number): T[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return entries.filter((e) => {
    const t = new Date(e.date + 'T00:00:00').getTime();
    return !Number.isNaN(t) && t >= cutoff;
  });
}

// ---------------------------------------------------------------------------
// Lab markers: reference ranges + per-marker scoring
// ---------------------------------------------------------------------------

export type MarkerStatus = 'optimal' | 'borderline' | 'out' | 'unknown';

export type MarkerMeta = {
  id: LabMarkerId | 'bmi';
  label: string;
  unit: string;
  /** Human-readable optimal range, e.g. "< 120" or "18.5–24.9". */
  optimalText: string;
  /** Score a value 0–100 and classify it. */
  evaluate: (value: number) => { score: number; status: MarkerStatus };
};

/**
 * A tiny scorer for "lower is better within a band" style markers.
 * `optimalMax` scores 100 and below; `hardMax` scores ~0.
 */
function bandLowerBetter(optimalMax: number, hardMax: number) {
  return (v: number) => {
    if (v <= optimalMax) return { score: 100, status: 'optimal' as MarkerStatus };
    const frac = (v - optimalMax) / (hardMax - optimalMax);
    const score = clamp(100 - frac * 100, 0, 100);
    return {
      score,
      status: (score >= 60 ? 'borderline' : 'out') as MarkerStatus,
    };
  };
}

/** Scorer for markers that are healthiest inside a [lo, hi] window. */
function bandWindow(lo: number, hi: number, span: number) {
  return (v: number) => {
    if (v >= lo && v <= hi) return { score: 100, status: 'optimal' as MarkerStatus };
    const dist = v < lo ? lo - v : v - hi;
    const score = clamp(100 - (dist / span) * 100, 0, 100);
    return {
      score,
      status: (score >= 60 ? 'borderline' : 'out') as MarkerStatus,
    };
  };
}

/** Scorer for "higher is better" markers (e.g. HDL cholesterol). */
function higherBetter(optimalMin: number, hardMin: number) {
  return (v: number) => {
    if (v >= optimalMin) return { score: 100, status: 'optimal' as MarkerStatus };
    const frac = (v - hardMin) / (optimalMin - hardMin);
    const score = clamp(frac * 100, 0, 100);
    return {
      score,
      status: (score >= 60 ? 'borderline' : 'out') as MarkerStatus,
    };
  };
}

/** Metadata + reference ranges for every marker we track. */
export const MARKERS: Record<LabMarkerId, MarkerMeta> = {
  systolicBP: {
    id: 'systolicBP',
    label: 'Blood pressure (systolic)',
    unit: 'mmHg',
    optimalText: '< 120',
    evaluate: bandLowerBetter(120, 160),
  },
  diastolicBP: {
    id: 'diastolicBP',
    label: 'Blood pressure (diastolic)',
    unit: 'mmHg',
    optimalText: '< 80',
    evaluate: bandLowerBetter(80, 110),
  },
  restingHR: {
    id: 'restingHR',
    label: 'Resting heart rate',
    unit: 'bpm',
    optimalText: '50–70',
    evaluate: bandWindow(50, 70, 30),
  },
  totalCholesterol: {
    id: 'totalCholesterol',
    label: 'Total cholesterol',
    unit: 'mg/dL',
    optimalText: '< 200',
    evaluate: bandLowerBetter(200, 280),
  },
  ldl: {
    id: 'ldl',
    label: 'LDL cholesterol',
    unit: 'mg/dL',
    optimalText: '< 100',
    evaluate: bandLowerBetter(100, 190),
  },
  hdl: {
    id: 'hdl',
    label: 'HDL cholesterol',
    unit: 'mg/dL',
    optimalText: '≥ 60',
    evaluate: higherBetter(60, 30),
  },
  triglycerides: {
    id: 'triglycerides',
    label: 'Triglycerides',
    unit: 'mg/dL',
    optimalText: '< 150',
    evaluate: bandLowerBetter(150, 500),
  },
  fastingGlucose: {
    id: 'fastingGlucose',
    label: 'Fasting glucose',
    unit: 'mg/dL',
    optimalText: '70–99',
    evaluate: bandWindow(70, 99, 50),
  },
  hba1c: {
    id: 'hba1c',
    label: 'HbA1c',
    unit: '%',
    optimalText: '< 5.7',
    evaluate: bandLowerBetter(5.7, 9),
  },
};

/** BMI is derived from the profile, so it gets its own metadata entry. */
export const BMI_META: MarkerMeta = {
  id: 'bmi',
  label: 'Body mass index (BMI)',
  unit: 'kg/m²',
  optimalText: '18.5–24.9',
  evaluate: bandWindow(18.5, 24.9, 12),
};

export function computeBMI(profile: Profile): number | null {
  if (!profile.heightCm || !profile.weightKg) return null;
  const m = profile.heightCm / 100;
  if (m <= 0) return null;
  return round1(profile.weightKg / (m * m));
}

/** The most recent reading for each marker (labs can span many dates). */
export function latestByMarker(labs: LabEntry[]): Partial<Record<LabMarkerId, LabEntry>> {
  const out: Partial<Record<LabMarkerId, LabEntry>> = {};
  for (const e of labs) {
    const cur = out[e.marker];
    if (!cur || e.createdAt > cur.createdAt) out[e.marker] = e;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Pillar scoring
// ---------------------------------------------------------------------------

export type PillarKey = 'labs' | 'exercise' | 'diet' | 'sleep';

export type PillarResult = {
  key: PillarKey;
  label: string;
  emoji: string;
  /** 0–100, or null when there's not enough data yet. */
  score: number | null;
  /** One-line human summary of the current state. */
  summary: string;
  /** Years this pillar adds to / subtracts from the baseline. */
  lifespanDelta: number;
  /** Actionable suggestions, best first. */
  tips: string[];
};

/**
 * Turn a 0–100 pillar score into a life-expectancy delta within
 * ±`maxYears`. 50 is neutral (0 years); 100 → +maxYears; 0 → -maxYears.
 */
function scoreToYears(score: number, maxYears: number): number {
  return round1(((score - 50) / 50) * maxYears);
}

// ---- Exercise -------------------------------------------------------------

function scoreExercise(entries: ExerciseEntry[]): PillarResult {
  const week = recent(entries, 7);
  const base: PillarResult = {
    key: 'exercise',
    label: 'Exercise',
    emoji: '🏃',
    score: null,
    summary: 'No activity logged in the last 7 days.',
    lifespanDelta: 0,
    tips: ['Aim for 150 min of moderate activity per week (WHO guideline).'],
  };
  if (week.length === 0) {
    // No data at all vs. logged-but-zero are different; treat empty as unknown.
    return entries.length === 0
      ? base
      : { ...base, score: 10, lifespanDelta: -2.5, summary: 'A sedentary week.' };
  }

  // Weight minutes by intensity toward the "moderate-equivalent" target.
  const weight = { light: 0.5, moderate: 1, vigorous: 2 } as const;
  const equiv = week.reduce((sum, e) => sum + e.minutes * weight[e.intensity], 0);

  // 150 moderate-equivalent min/week = 100. Extra credit tapers past 300.
  const score = clamp((equiv / 150) * 100, 0, 100);
  const lifespanDelta = clamp(scoreToYears(score, 3.5), -3, 3.5);

  const tips: string[] = [];
  if (equiv < 150)
    tips.push(`You're at ~${Math.round(equiv)} of 150 moderate-equiv min this week.`);
  if (!week.some((e) => e.intensity === 'vigorous'))
    tips.push('Add a vigorous session — it counts double toward your target.');
  const hasStrength = week.some((e) => /weight|strength|resist|lift/i.test(e.activity));
  if (!hasStrength) tips.push('Include 2 strength sessions a week for muscle & bone.');

  return {
    ...base,
    score,
    lifespanDelta,
    summary: `~${Math.round(equiv)} moderate-equiv min this week across ${week.length} session${
      week.length === 1 ? '' : 's'
    }.`,
    tips: tips.length ? tips : ['Great work — you are meeting activity targets.'],
  };
}

// ---- Sleep ----------------------------------------------------------------

function scoreSleep(entries: SleepEntry[]): PillarResult {
  const week = recent(entries, 7);
  const base: PillarResult = {
    key: 'sleep',
    label: 'Sleep',
    emoji: '😴',
    score: null,
    summary: 'No sleep logged in the last 7 days.',
    lifespanDelta: 0,
    tips: ['Aim for a consistent 7–8 hours per night.'],
  };
  if (week.length === 0) return base;

  const meanHours = avg(week.map((e) => e.hours));
  const meanQuality = avg(week.map((e) => e.quality)); // 1–5

  // Duration: best inside 7–8.5h, penalized as you move away.
  const durScore =
    meanHours >= 7 && meanHours <= 8.5
      ? 100
      : clamp(100 - Math.abs(meanHours - 7.75) * 22, 0, 100);
  // Quality contributes a quarter of the score.
  const qualScore = ((meanQuality - 1) / 4) * 100;
  const score = clamp(durScore * 0.75 + qualScore * 0.25, 0, 100);
  const lifespanDelta = clamp(scoreToYears(score, 2.5), -2.5, 2);

  const tips: string[] = [];
  if (meanHours < 7) tips.push(`Averaging ${round1(meanHours)}h — try for at least 7.`);
  if (meanHours > 9) tips.push(`Averaging ${round1(meanHours)}h — long sleep can signal issues.`);
  if (meanQuality < 3.5) tips.push('Improve sleep quality: dark, cool room; no late screens.');

  return {
    ...base,
    score,
    lifespanDelta,
    summary: `Averaging ${round1(meanHours)}h/night, quality ${round1(meanQuality)}/5.`,
    tips: tips.length ? tips : ['Your sleep is in a healthy range — keep it consistent.'],
  };
}

// ---- Diet -----------------------------------------------------------------

function scoreDiet(entries: DietEntry[]): PillarResult {
  const week = recent(entries, 7);
  const base: PillarResult = {
    key: 'diet',
    label: 'Diet',
    emoji: '🥗',
    score: null,
    summary: 'No diet logged in the last 7 days.',
    lifespanDelta: 0,
    tips: ['Aim for 5 servings of fruit & veg a day; limit sugar & alcohol.'],
  };
  if (week.length === 0) return base;

  const meanQuality = avg(week.map((e) => e.quality)); // 1–5
  const meanFruitVeg = avg(week.map((e) => e.fruitVeg));
  const meanSugary = avg(week.map((e) => e.sugaryDrinks));
  const meanAlcohol = avg(week.map((e) => e.alcoholUnits));

  let score = ((meanQuality - 1) / 4) * 100; // quality is the backbone
  score += clamp((meanFruitVeg / 5) * 20, 0, 20); // up to +20 for produce
  score -= clamp(meanSugary * 6, 0, 24); // sugary drinks hurt
  score -= clamp(Math.max(0, meanAlcohol - 1) * 8, 0, 24); // >1 unit/day hurts
  score = clamp(score, 0, 100);
  const lifespanDelta = clamp(scoreToYears(score, 3), -3, 2.5);

  const tips: string[] = [];
  if (meanFruitVeg < 5)
    tips.push(`Fruit & veg ~${round1(meanFruitVeg)}/day — build toward 5.`);
  if (meanSugary >= 1) tips.push('Cut back on sugary drinks — swap for water or tea.');
  if (meanAlcohol > 1) tips.push('Trim alcohol toward ≤1 unit/day (or fewer).');

  return {
    ...base,
    score,
    lifespanDelta,
    summary: `Quality ${round1(meanQuality)}/5, ${round1(meanFruitVeg)} fruit/veg per day.`,
    tips: tips.length ? tips : ['Balanced eating — nicely done.'],
  };
}

// ---- Labs -----------------------------------------------------------------

export type LabMarkerResult = {
  meta: MarkerMeta;
  value: number;
  date: string;
  score: number;
  status: MarkerStatus;
};

/** Evaluate every marker we have data for (including derived BMI). */
export function evaluateLabs(data: HealthData): LabMarkerResult[] {
  const results: LabMarkerResult[] = [];
  const latest = latestByMarker(data.labs);
  for (const meta of Object.values(MARKERS)) {
    // Every entry in MARKERS is a real lab marker (never the derived 'bmi').
    const entry = latest[meta.id as LabMarkerId];
    if (!entry) continue;
    const { score, status } = meta.evaluate(entry.value);
    results.push({ meta, value: entry.value, date: entry.date, score, status });
  }
  const bmi = computeBMI(data.profile);
  if (bmi != null) {
    const { score, status } = BMI_META.evaluate(bmi);
    results.push({ meta: BMI_META, value: bmi, date: 'derived', score, status });
  }
  return results;
}

function scoreLabs(data: HealthData): PillarResult {
  const results = evaluateLabs(data);
  const base: PillarResult = {
    key: 'labs',
    label: 'Labs',
    emoji: '🩸',
    score: null,
    summary: 'No lab markers recorded yet.',
    lifespanDelta: 0,
    tips: ['Add key markers: blood pressure, cholesterol, HbA1c, glucose.'],
  };
  if (results.length === 0) return base;

  const score = clamp(avg(results.map((r) => r.score)), 0, 100);
  const lifespanDelta = clamp(scoreToYears(score, 4), -4, 3);

  const outOfRange = results.filter((r) => r.status !== 'optimal');
  const tips = outOfRange.length
    ? outOfRange
        .slice(0, 3)
        .map((r) => `${r.meta.label}: ${r.value}${r.meta.unit ? ' ' + r.meta.unit : ''} (aim ${r.meta.optimalText}).`)
    : ['Every recorded marker is in its optimal range — excellent.'];

  return {
    ...base,
    score,
    lifespanDelta,
    summary: `${results.length} marker${results.length === 1 ? '' : 's'} tracked, ${
      results.length - outOfRange.length
    } in optimal range.`,
    tips,
  };
}

// ---------------------------------------------------------------------------
// Overall summary
// ---------------------------------------------------------------------------

export type HealthSummary = {
  pillars: PillarResult[];
  /** 0–100 overall score (weighted average of pillars with data). */
  overallScore: number | null;
  baselineLifeExpectancy: number;
  /** Baseline + sum of pillar deltas, clamped sensibly. */
  estimatedLifeExpectancy: number;
  totalDelta: number;
  /** How many pillars actually have data (0–4). */
  pillarsWithData: number;
};

/** Baseline life expectancy at birth, by sex (rough global-developed avg). */
export function baselineLifeExpectancy(profile: Profile): number {
  return profile.sex === 'female' ? 83 : 79;
}

/** Weight each pillar's contribution to the overall score. */
const PILLAR_WEIGHT: Record<PillarKey, number> = {
  labs: 0.35,
  exercise: 0.25,
  diet: 0.2,
  sleep: 0.2,
};

export function summarize(data: HealthData): HealthSummary {
  const pillars = [
    scoreLabs(data),
    scoreExercise(data.exercise),
    scoreDiet(data.diet),
    scoreSleep(data.sleep),
  ];

  const withData = pillars.filter((p) => p.score != null);
  let overallScore: number | null = null;
  if (withData.length) {
    const totalWeight = withData.reduce((s, p) => s + PILLAR_WEIGHT[p.key], 0);
    overallScore = clamp(
      withData.reduce((s, p) => s + (p.score as number) * PILLAR_WEIGHT[p.key], 0) /
        totalWeight,
      0,
      100
    );
  }

  const baseline = baselineLifeExpectancy(data.profile);
  const totalDelta = round1(pillars.reduce((s, p) => s + p.lifespanDelta, 0));
  // Keep the estimate within a believable ±12-year envelope of baseline.
  const estimate = round1(clamp(baseline + totalDelta, baseline - 12, baseline + 12));

  return {
    pillars,
    overallScore: overallScore == null ? null : Math.round(overallScore),
    baselineLifeExpectancy: baseline,
    estimatedLifeExpectancy: estimate,
    totalDelta,
    pillarsWithData: withData.length,
  };
}

/** Best few tips across all pillars, prioritising the weakest pillar first. */
export function topTips(summary: HealthSummary, limit = 4): string[] {
  const ranked = [...summary.pillars]
    .filter((p) => p.tips.length)
    .sort((a, b) => (a.score ?? 999) - (b.score ?? 999));
  const out: string[] = [];
  for (const p of ranked) {
    for (const t of p.tips) {
      out.push(`${p.emoji} ${t}`);
      if (out.length >= limit) return out;
    }
  }
  return out;
}
