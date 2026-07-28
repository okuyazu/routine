/**
 * ConceptsContext.tsx
 * -------------------------------------------------------------
 * This is the app's "single source of truth" for concepts.
 *
 * React Context lets us store data in ONE place and read it from ANY
 * screen without passing it down manually through every component.
 * Any screen can call `useConcepts()` to get the list and the actions
 * (add, regenerate, remove).
 *
 * It also wires everything together:
 *   user adds a concept  ->  save to storage  ->  ask ai.ts to generate
 *   ->  save the result  ->  screens automatically re-render.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { Concept } from './types';
import { loadConcepts, saveConcepts } from './storage';
import { generateConcept } from './ai';
import { LibraryConcept, flashcardsForTitle, deepDiveForTitle } from './library';

// The set of things a screen can read/do through this context.
type ConceptsContextValue = {
  concepts: Concept[];
  /** True only during the very first load from storage. */
  loading: boolean;
  /** Add a new concept and start generating its content. Returns its id. */
  addConcept: (title: string) => Promise<string>;
  /**
   * Add a concept straight from the built-in library — instantly ready,
   * no generation delay. If it's already saved, returns the existing id.
   */
  addFromLibrary: (item: LibraryConcept) => string;
  /** Re-run generation for an existing concept (e.g. after an error). */
  regenerate: (id: string) => Promise<void>;
  /** Delete a concept. */
  removeConcept: (id: string) => void;
  /** Look up a single concept by id. */
  getConcept: (id: string) => Concept | undefined;
};

const ConceptsContext = createContext<ConceptsContextValue | undefined>(undefined);

// Create a reasonably unique id without extra libraries.
function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ConceptsProvider({ children }: { children: ReactNode }) {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(true);

  // On first mount, load saved concepts from the device.
  useEffect(() => {
    let active = true;
    (async () => {
      const saved = await loadConcepts();
      if (active) {
        setConcepts(saved);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Whenever the list changes (after initial load), persist it.
  useEffect(() => {
    if (!loading) {
      saveConcepts(concepts);
    }
  }, [concepts, loading]);

  /**
   * Shared logic to (re)generate content for a concept id.
   * Marks it "generating", calls the AI, then stores the result or error.
   */
  const runGeneration = useCallback(async (id: string, title: string) => {
    // Mark as generating.
    setConcepts((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status: 'generating', error: undefined } : c
      )
    );

    try {
      const content = await generateConcept(title);
      // If this concept is in the library, it comes with flashcards and
      // (sometimes) premium deep-dive content.
      const flashcards = flashcardsForTitle(title);
      const deepDive = deepDiveForTitle(title);
      setConcepts((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, status: 'ready', content, flashcards, deepDive, error: undefined }
            : c
        )
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      setConcepts((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, status: 'error', error: message } : c
        )
      );
    }
  }, []);

  const addConcept = useCallback(
    async (title: string): Promise<string> => {
      const id = makeId();
      const newConcept: Concept = {
        id,
        title: title.trim(),
        createdAt: Date.now(),
        status: 'generating',
      };
      // Add it to the top of the list immediately (so the UI feels instant).
      setConcepts((prev) => [newConcept, ...prev]);
      // Kick off generation in the background.
      runGeneration(id, newConcept.title);
      return id;
    },
    [runGeneration]
  );

  const addFromLibrary = useCallback(
    (item: LibraryConcept): string => {
      // If we already have this concept (same title), just return its id.
      const existing = concepts.find(
        (c) => c.title.toLowerCase() === item.title.toLowerCase()
      );
      if (existing) return existing.id;

      const id = makeId();
      const newConcept: Concept = {
        id,
        title: item.title,
        createdAt: Date.now(),
        status: 'ready', // library content is ready immediately
        content: item.content,
        flashcards: item.flashcards,
        deepDive: item.deepDive,
      };
      setConcepts((prev) => [newConcept, ...prev]);
      return id;
    },
    [concepts]
  );

  const regenerate = useCallback(
    async (id: string) => {
      const concept = concepts.find((c) => c.id === id);
      if (concept) await runGeneration(id, concept.title);
    },
    [concepts, runGeneration]
  );

  const removeConcept = useCallback((id: string) => {
    setConcepts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const getConcept = useCallback(
    (id: string) => concepts.find((c) => c.id === id),
    [concepts]
  );

  const value: ConceptsContextValue = {
    concepts,
    loading,
    addConcept,
    addFromLibrary,
    regenerate,
    removeConcept,
    getConcept,
  };

  return <ConceptsContext.Provider value={value}>{children}</ConceptsContext.Provider>;
}

/** Hook every screen uses to access concepts and actions. */
export function useConcepts(): ConceptsContextValue {
  const ctx = useContext(ConceptsContext);
  if (!ctx) {
    throw new Error('useConcepts must be used inside a <ConceptsProvider>.');
  }
  return ctx;
}
