/**
 * types.ts
 * -------------------------------------------------------------
 * TypeScript "types" describe the shape of our data. They don't
 * do anything at runtime — they just let the editor catch mistakes
 * (like a typo in a property name) before you ever run the app.
 *
 * Everything the user logs falls into four "pillars": labs,
 * exercise, diet, and sleep. Together with a basic profile, these
 * feed the health-score / life-expectancy estimate (see health.ts).
 */

/** Dates are stored as plain 'YYYY-MM-DD' strings — easy to read & sort. */
export type ISODate = string;

export type Sex = 'male' | 'female';

/**
 * Basic profile. Age + sex set a baseline life expectancy; height +
 * weight give us BMI, which is one of the lab-pillar markers.
 */
export type Profile = {
  age: number | null;
  sex: Sex;
  heightCm: number | null;
  weightKg: number | null;
};

/**
 * The lab markers we understand. Each id maps to a reference range
 * and unit defined in health.ts. BMI is derived from the profile, so
 * it is NOT logged here — the others are entered from a blood panel,
 * a home BP cuff, a smartwatch, etc.
 */
export type LabMarkerId =
  | 'systolicBP'
  | 'diastolicBP'
  | 'restingHR'
  | 'totalCholesterol'
  | 'ldl'
  | 'hdl'
  | 'triglycerides'
  | 'fastingGlucose'
  | 'hba1c';

/** A single lab reading: which marker, its value, and when it was taken. */
export type LabEntry = {
  id: string;
  createdAt: number;
  date: ISODate;
  marker: LabMarkerId;
  value: number;
};

export type ExerciseIntensity = 'light' | 'moderate' | 'vigorous';

/** One workout / activity session. */
export type ExerciseEntry = {
  id: string;
  createdAt: number;
  date: ISODate;
  activity: string; // e.g. "Run", "Weights", "Cycling"
  minutes: number;
  intensity: ExerciseIntensity;
};

/** One day's diet snapshot (kept coarse on purpose — quick to log). */
export type DietEntry = {
  id: string;
  createdAt: number;
  date: ISODate;
  /** Self-rated overall quality of the day's eating, 1 (poor) – 5 (excellent). */
  quality: number;
  /** Servings of fruit & vegetables that day. */
  fruitVeg: number;
  /** Sugary drinks (soda, juice, sweetened coffee) that day. */
  sugaryDrinks: number;
  /** Standard alcohol units that day. */
  alcoholUnits: number;
};

/** One night's sleep. */
export type SleepEntry = {
  id: string;
  createdAt: number;
  date: ISODate;
  hours: number;
  /** Self-rated sleep quality, 1 (poor) – 5 (excellent). */
  quality: number;
};

/** The whole app's data — persisted as one blob in storage.ts. */
export type HealthData = {
  profile: Profile;
  labs: LabEntry[];
  exercise: ExerciseEntry[];
  diet: DietEntry[];
  sleep: SleepEntry[];
};

export const emptyHealthData = (): HealthData => ({
  profile: { age: null, sex: 'male', heightCm: null, weightKg: null },
  labs: [],
  exercise: [],
  diet: [],
  sleep: [],
});
