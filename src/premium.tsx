/**
 * premium.tsx
 * -------------------------------------------------------------
 * Tracks whether the user has unlocked PREMIUM (the paid "deep dive"
 * content). Right now this is a simple on/off flag stored on the device,
 * with a testing toggle so you can see both the locked and unlocked views.
 *
 * LATER (real payments): replace `unlock()` with a real purchase via the
 * app stores. The recommended tool is RevenueCat — it wraps Apple/Google
 * in-app purchases and tells you whether the user is "entitled". You'd
 * set `isPremium` from RevenueCat's entitlement status and keep the rest
 * of the app exactly as it is.
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

const STORAGE_KEY = 'philosophy.premium.v1';

type PremiumContextValue = {
  /** Whether premium content is unlocked. */
  isPremium: boolean;
  /** Unlock premium (today: instant; later: after a real purchase). */
  unlock: () => void;
  /** Re-lock — only useful for testing the paywall. */
  lock: () => void;
};

const PremiumContext = createContext<PremiumContextValue | undefined>(undefined);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);

  // Load the saved flag on startup.
  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw === 'true') setIsPremium(true);
    })();
  }, []);

  const persist = useCallback(async (value: boolean) => {
    setIsPremium(value);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
    } catch {
      // ignore write errors for this simple flag
    }
  }, []);

  const unlock = useCallback(() => persist(true), [persist]);
  const lock = useCallback(() => persist(false), [persist]);

  return (
    <PremiumContext.Provider value={{ isPremium, unlock, lock }}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium(): PremiumContextValue {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error('usePremium must be used inside a <PremiumProvider>.');
  return ctx;
}
