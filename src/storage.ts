/**
 * storage.ts
 * -------------------------------------------------------------
 * Saves and loads the whole health dataset on the device using
 * AsyncStorage — a simple key/value store built into React Native
 * (think of it as a tiny persistent notebook). Everything is stored
 * on THIS device; nothing is uploaded anywhere.
 *
 * When you later add accounts / cloud sync, this is one of the few
 * files you'd change.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { HealthData, emptyHealthData } from './types';

// The "key" under which we store everything. The ".v1" lets us change
// the storage format later without clashing with old data.
const STORAGE_KEY = 'vita.health.v1';

/** Read the saved health data. Returns an empty dataset if none / on error. */
export async function loadHealthData(): Promise<HealthData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyHealthData();
    const parsed = JSON.parse(raw) as Partial<HealthData>;
    // Merge with defaults so missing arrays/profile never crash the app.
    const base = emptyHealthData();
    return {
      profile: { ...base.profile, ...(parsed.profile ?? {}) },
      labs: Array.isArray(parsed.labs) ? parsed.labs : [],
      exercise: Array.isArray(parsed.exercise) ? parsed.exercise : [],
      diet: Array.isArray(parsed.diet) ? parsed.diet : [],
      sleep: Array.isArray(parsed.sleep) ? parsed.sleep : [],
    };
  } catch (err) {
    console.warn('Failed to load health data:', err);
    return emptyHealthData();
  }
}

/** Save the full dataset, replacing whatever was there. */
export async function saveHealthData(data: HealthData): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to save health data:', err);
  }
}
