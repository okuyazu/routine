/**
 * progress.tsx
 * -------------------------------------------------------------
 * Tracks how well you know each flashcard, so the app can help you
 * REMEMBER — the thing a chatbot can't do. This is the heart of the
 * "learning tool, not a search box" idea.
 *
 * It uses a simple, proven method called the Leitner system (spaced
 * repetition): every card lives in a "box" 0–5. Answer "Got it" and the
 * card moves up a box and won't be due again for longer; answer "Review
 * again" and it drops back to box 0 and returns soon.
 *
 * We also track a daily streak (consecutive days you reviewed).
 * Everything is stored on the device.
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

const STORAGE_KEY = 'philosophy.progress.v1';
const DAY_MS = 24 * 60 * 60 * 1000;

/** How many days until a card in each box becomes due again. */
const INTERVALS_DAYS = [0, 1, 3, 7, 14, 30];
/**
 * A card in this box or higher counts as "learned" — i.e. you've answered
 * it correctly at least once. (Box 1 = one correct answer.) The spaced-
 * repetition schedule keeps deepening the card through the higher boxes,
 * but "learned" gives immediate, satisfying feedback after a quiz.
 */
const LEARNED_BOX = 1;

/** Progress for a single card. */
type CardProgress = {
  box: number; // 0..5
  last: number; // last reviewed (timestamp)
  due: number; // next due (timestamp)
};

type ProgressState = {
  cards: Record<string, CardProgress>;
  streakCount: number;
  lastDay: string | null;
};

const EMPTY: ProgressState = { cards: {}, streakCount: 0, lastDay: null };

type ProgressContextValue = {
  /** Record an answer for a card. `known` = the user pressed "Got it". */
  recordAnswer: (key: string, known: boolean) => void;
  /** Timestamp a card is due (0 if never seen — i.e. treat as due now). */
  dueAt: (key: string) => number;
  /** How many of these card keys are "learned", and the total. */
  learnedOf: (keys: string[]) => { learned: number; total: number };
  /** How many of these cards are due for review right now. */
  dueCount: (keys: string[]) => number;
  /** Current daily streak. */
  streak: number;
};

const ProgressContext = createContext<ProgressContextValue | undefined>(undefined);

/** A stable key for a card: its concept + its question text. */
export function cardKeyOf(source: string, front: string): string {
  return `${source}|||${front}`;
}

/** Local calendar day as a stable string, e.g. "2026-6-30". */
function dayStr(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProgressState>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  // Load saved progress once.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setState({ ...EMPTY, ...JSON.parse(raw) });
      } catch {
        // ignore
      }
      setLoaded(true);
    })();
  }, []);

  // Persist whenever it changes (after the first load).
  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, loaded]);

  const recordAnswer = useCallback((key: string, known: boolean) => {
    setState((prev) => {
      const cur = prev.cards[key] ?? { box: 0, last: 0, due: 0 };
      const box = known ? Math.min(cur.box + 1, INTERVALS_DAYS.length - 1) : 0;
      const now = Date.now();
      const due = now + INTERVALS_DAYS[box] * DAY_MS;

      // Update the daily streak.
      const today = dayStr(now);
      let { streakCount, lastDay } = prev;
      if (lastDay !== today) {
        const yesterday = dayStr(now - DAY_MS);
        streakCount = lastDay === yesterday ? prev.streakCount + 1 : 1;
        lastDay = today;
      }

      return {
        cards: { ...prev.cards, [key]: { box, last: now, due } },
        streakCount,
        lastDay,
      };
    });
  }, []);

  const dueAt = useCallback(
    (key: string) => state.cards[key]?.due ?? 0,
    [state.cards]
  );

  const learnedOf = useCallback(
    (keys: string[]) => {
      let learned = 0;
      keys.forEach((k) => {
        if ((state.cards[k]?.box ?? 0) >= LEARNED_BOX) learned++;
      });
      return { learned, total: keys.length };
    },
    [state.cards]
  );

  const dueCount = useCallback(
    (keys: string[]) => {
      const now = Date.now();
      let n = 0;
      keys.forEach((k) => {
        const c = state.cards[k];
        // Unseen cards (no record) count as due; seen cards when past due.
        if (!c || c.due <= now) n++;
      });
      return n;
    },
    [state.cards]
  );

  return (
    <ProgressContext.Provider
      value={{ recordAnswer, dueAt, learnedOf, dueCount, streak: state.streakCount }}
    >
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside a <ProgressProvider>.');
  return ctx;
}
