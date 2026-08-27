/**
 * storage.ts
 * -------------------------------------------------------------
 * Saves and loads the mockup's state on the device using AsyncStorage.
 * Everything stays on THIS phone; nothing is uploaded anywhere — health
 * data is treated as sensitive.
 *
 * NOTE: measurement events are append-only in the app's logic; this file
 * just persists whatever list it is given. When you later add a real
 * backend + Postgres, this is one of the few files you'd replace.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { EngineEvaluation, MeasurementEvent, Subject } from './types';

const KEY_SUBJECTS = 'lid.subjects.v1';
const KEY_MEASUREMENTS = 'lid.measurements.v1';
const KEY_EVALUATIONS = 'lid.evaluations.v1';
const KEY_SEEDED = 'lid.seeded.v1';

async function loadList<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (err) {
    console.warn(`Failed to load ${key}:`, err);
    return [];
  }
}

async function saveList<T>(key: string, list: T[]): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(list));
  } catch (err) {
    console.warn(`Failed to save ${key}:`, err);
  }
}

export const loadSubjects = () => loadList<Subject>(KEY_SUBJECTS);
export const saveSubjects = (s: Subject[]) => saveList(KEY_SUBJECTS, s);

export const loadMeasurements = () => loadList<MeasurementEvent>(KEY_MEASUREMENTS);
export const saveMeasurements = (m: MeasurementEvent[]) =>
  saveList(KEY_MEASUREMENTS, m);

export const loadEvaluations = () => loadList<EngineEvaluation>(KEY_EVALUATIONS);
export const saveEvaluations = (e: EngineEvaluation[]) =>
  saveList(KEY_EVALUATIONS, e);

/** Whether we've already seeded demo data once (so we don't re-add it). */
export async function hasSeeded(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY_SEEDED)) === 'yes';
  } catch {
    return false;
  }
}

export async function markSeeded(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_SEEDED, 'yes');
  } catch (err) {
    console.warn('Failed to mark seeded:', err);
  }
}
