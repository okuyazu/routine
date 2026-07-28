/**
 * types.ts
 * -------------------------------------------------------------
 * TypeScript "types" describe the shape of our data. They don't
 * do anything at runtime — they just let the editor catch mistakes
 * (like a typo in a property name) before you ever run the app.
 */

/**
 * The content the AI produces for a single philosophical concept.
 * These are exactly the four things the app displays on the detail screen.
 */
export type GeneratedContent = {
  /** A one-sentence summary shown under the title. */
  summary: string;
  /** The main teaching text — a few short paragraphs. */
  lesson: string;
  /** Bullet-point takeaways: the essential ideas to remember. */
  keyIdeas: string[];
  /** Bullet-point ways to actually apply the idea in daily life. */
  practicalPoints: string[];
};

/**
 * A single flashcard: a question on the front, the answer on the back.
 * Used by the quiz / review mode.
 */
export type Flashcard = {
  front: string;
  back: string;
};

/**
 * One section of premium "deep dive" content — a heading and a body of
 * text. A concept's deep dive is a list of these (History, Key Thinkers,
 * etc.). This is the paid, "go deeper" material.
 */
export type DeepDiveSection = {
  heading: string;
  body: string;
};

/** Where a concept is in its lifecycle. Used to show spinners / errors. */
export type ConceptStatus = 'generating' | 'ready' | 'error';

/**
 * A concept the user has added, plus whatever the AI generated for it.
 */
export type Concept = {
  /** Unique id (we generate one when the concept is created). */
  id: string;
  /** What the user typed, e.g. "Stoicism". */
  title: string;
  /** When it was created (milliseconds since 1970) — used for sorting. */
  createdAt: number;
  /** Current state: still generating, ready to read, or failed. */
  status: ConceptStatus;
  /** The generated content (present once status === 'ready'). */
  content?: GeneratedContent;
  /** Flashcards for quiz/review mode (present when we have them). */
  flashcards?: Flashcard[];
  /**
   * Premium "deep dive" sections. Present only for concepts that have
   * paid depth authored. Shown locked until the user unlocks premium.
   */
  deepDive?: DeepDiveSection[];
  /** An error message (present only if status === 'error'). */
  error?: string;
};
