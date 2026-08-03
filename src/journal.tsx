/**
 * journal.tsx
 * -------------------------------------------------------------
 * Saves the user's written reflections from "Reflect" mode. Answers are
 * stored per concept + question, so reopening a concept shows what you
 * wrote before. Everything stays on the device.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'philosophy.journal.v1';

/** A stable key for one reflection answer. */
function entryKey(conceptTitle: string, question: string): string {
  return `${conceptTitle}|||${question}`;
}

type JournalState = Record<string, string>;

type JournalContextValue = {
  /** The saved answer for a concept+question ('' if none). */
  getAnswer: (conceptTitle: string, question: string) => string;
  /** Save/replace an answer. */
  setAnswer: (conceptTitle: string, question: string, text: string) => void;
  /** How many of these questions have a non-empty answer. */
  answeredCount: (conceptTitle: string, questions: string[]) => number;
};

const JournalContext = createContext<JournalContextValue | undefined>(undefined);

export function JournalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<JournalState>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setState(JSON.parse(raw));
      } catch {
        // ignore
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, loaded]);

  const getAnswer = useCallback(
    (conceptTitle: string, question: string) => state[entryKey(conceptTitle, question)] ?? '',
    [state]
  );

  const setAnswer = useCallback(
    (conceptTitle: string, question: string, text: string) => {
      setState((prev) => ({ ...prev, [entryKey(conceptTitle, question)]: text }));
    },
    []
  );

  const answeredCount = useCallback(
    (conceptTitle: string, questions: string[]) =>
      questions.filter((q) => (state[entryKey(conceptTitle, q)] ?? '').trim().length > 0)
        .length,
    [state]
  );

  return (
    <JournalContext.Provider value={{ getAnswer, setAnswer, answeredCount }}>
      {children}
    </JournalContext.Provider>
  );
}

export function useJournal(): JournalContextValue {
  const ctx = useContext(JournalContext);
  if (!ctx) throw new Error('useJournal must be used inside a <JournalProvider>.');
  return ctx;
}
