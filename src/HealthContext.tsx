/**
 * HealthContext.tsx
 * -------------------------------------------------------------
 * The app's "single source of truth" for everything the user logs.
 *
 * React Context lets us store data in ONE place and read it from ANY
 * screen without passing it down manually. Any screen can call
 * `useHealth()` to get the data plus actions (add / remove entries,
 * update the profile). Every change is persisted to the device.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import {
  DietEntry,
  ExerciseEntry,
  HealthData,
  LabEntry,
  Profile,
  SleepEntry,
  emptyHealthData,
} from './types';
import { loadHealthData, saveHealthData } from './storage';
import { HealthSummary, summarize } from './health';

// Create a reasonably unique id without extra libraries.
function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Today's date as 'YYYY-MM-DD' (local time). */
export function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

type HealthContextValue = {
  data: HealthData;
  /** True only during the very first load from storage. */
  loading: boolean;
  /** Derived scores + life-expectancy estimate (recomputed on every change). */
  summary: HealthSummary;

  updateProfile: (patch: Partial<Profile>) => void;

  addLab: (entry: Omit<LabEntry, 'id' | 'createdAt'>) => void;
  addExercise: (entry: Omit<ExerciseEntry, 'id' | 'createdAt'>) => void;
  addDiet: (entry: Omit<DietEntry, 'id' | 'createdAt'>) => void;
  addSleep: (entry: Omit<SleepEntry, 'id' | 'createdAt'>) => void;

  /** Remove one entry from any pillar by id. */
  removeEntry: (pillar: 'labs' | 'exercise' | 'diet' | 'sleep', id: string) => void;
};

const HealthContext = createContext<HealthContextValue | undefined>(undefined);

export function HealthProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<HealthData>(emptyHealthData);
  const [loading, setLoading] = useState(true);

  // On first mount, load saved data from the device.
  useEffect(() => {
    let active = true;
    (async () => {
      const saved = await loadHealthData();
      if (active) {
        setData(saved);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Whenever the data changes (after initial load), persist it.
  useEffect(() => {
    if (!loading) saveHealthData(data);
  }, [data, loading]);

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setData((prev) => ({ ...prev, profile: { ...prev.profile, ...patch } }));
  }, []);

  const addLab = useCallback((entry: Omit<LabEntry, 'id' | 'createdAt'>) => {
    setData((prev) => ({
      ...prev,
      labs: [{ ...entry, id: makeId(), createdAt: Date.now() }, ...prev.labs],
    }));
  }, []);

  const addExercise = useCallback((entry: Omit<ExerciseEntry, 'id' | 'createdAt'>) => {
    setData((prev) => ({
      ...prev,
      exercise: [{ ...entry, id: makeId(), createdAt: Date.now() }, ...prev.exercise],
    }));
  }, []);

  const addDiet = useCallback((entry: Omit<DietEntry, 'id' | 'createdAt'>) => {
    setData((prev) => ({
      ...prev,
      diet: [{ ...entry, id: makeId(), createdAt: Date.now() }, ...prev.diet],
    }));
  }, []);

  const addSleep = useCallback((entry: Omit<SleepEntry, 'id' | 'createdAt'>) => {
    setData((prev) => ({
      ...prev,
      sleep: [{ ...entry, id: makeId(), createdAt: Date.now() }, ...prev.sleep],
    }));
  }, []);

  const removeEntry = useCallback(
    (pillar: 'labs' | 'exercise' | 'diet' | 'sleep', id: string) => {
      setData((prev) => ({
        ...prev,
        [pillar]: (prev[pillar] as { id: string }[]).filter((e) => e.id !== id),
      }));
    },
    []
  );

  // Recompute the scores/estimate whenever the underlying data changes.
  const summary = useMemo(() => summarize(data), [data]);

  const value: HealthContextValue = {
    data,
    loading,
    summary,
    updateProfile,
    addLab,
    addExercise,
    addDiet,
    addSleep,
    removeEntry,
  };

  return <HealthContext.Provider value={value}>{children}</HealthContext.Provider>;
}

/** Hook every screen uses to access health data and actions. */
export function useHealth(): HealthContextValue {
  const ctx = useContext(HealthContext);
  if (!ctx) {
    throw new Error('useHealth must be used inside a <HealthProvider>.');
  }
  return ctx;
}
