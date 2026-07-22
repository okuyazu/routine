/**
 * storage.ts
 * -------------------------------------------------------------
 * Saves and loads concepts on the device using AsyncStorage — a
 * simple key/value store built into React Native (think of it as a
 * tiny persistent notebook). Everything is stored on THIS phone;
 * nothing is uploaded anywhere.
 *
 * When you later add accounts / cloud sync, this is one of the few
 * files you'd change.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Concept } from './types';

// The "key" under which we store the whole list. The ".v1" lets us
// change the storage format later without clashing with old data.
const STORAGE_KEY = 'philosophy.concepts.v1';

/** Read all saved concepts. Returns an empty list if none / on error. */
export async function loadConcepts(): Promise<Concept[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Concept[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to load concepts:', err);
    return [];
  }
}

/** Save the full list of concepts, replacing whatever was there. */
export async function saveConcepts(concepts: Concept[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(concepts));
  } catch (err) {
    console.warn('Failed to save concepts:', err);
  }
}
