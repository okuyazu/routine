/**
 * ai.ts
 * =============================================================
 * THE SINGLE PLACE WHERE CONTENT IS GENERATED.
 *
 * The rest of the app just calls `generateConcept("Stoicism")` and
 * gets back a lesson, key ideas, and practical points. It doesn't
 * care HOW that content is made.
 *
 * Right now this returns hand-written placeholder content after a
 * short fake delay (so you can build and feel the whole app without
 * any API keys or backend).
 *
 * WHEN YOU'RE READY FOR REAL AI:
 * Replace the body of `generateConcept` with a real Claude API call.
 * A ready-to-adapt version is in the big comment block at the bottom
 * of this file. Nothing else in the app needs to change.
 * =============================================================
 */

import { GeneratedContent } from './types';
import { findLibraryConcept } from './library';

/** Pretend the AI is "thinking" so we can see the loading state. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build reasonable generic content for ANY concept the user types,
 * when it isn't in the built-in library. It's templated, but written to
 * read naturally and give a real structure to think with.
 */
function genericContent(title: string): GeneratedContent {
  const t = title.trim();
  return {
    summary: `A structured introduction to ${t}: what it means, why it matters, and how to put it into practice.`,
    lesson:
      `${t} is best understood by asking three questions: What core problem or experience is it responding to? What does it claim in answer? And what would it look like to actually live by it?\n\n` +
      `Start with the problem it addresses — most philosophical ideas arise because a thinker was troubled by something (how to live well, what we can know, what is fair). ${t} offers a particular stance on that problem. ` +
      `Rather than memorizing a definition, try to reconstruct the reasoning: what would have to be true for this view to make sense, and where might a thoughtful person push back?\n\n` +
      `Finally, treat ${t} as a lens. The real test of a philosophy is not whether you can recite it, but whether looking through it changes how you notice, choose, and act in ordinary situations.`,
    keyIdeas: [
      `${t} responds to a specific human problem — identify that problem first.`,
      `Focus on the reasoning behind ${t}, not just its definition.`,
      `Every strong idea has thoughtful objections — know the best ones.`,
      `Understanding deepens when you can restate ${t} in your own words.`,
    ],
    practicalPoints: [
      `Explain ${t} to a friend in two plain sentences.`,
      `Find one situation this week where ${t} would change your response.`,
      `Write down the strongest objection to ${t}, then a possible reply.`,
      `Keep a note of moments where this lens genuinely shifted your thinking.`,
    ],
  };
}

/**
 * Generate content for a concept.
 *
 * @param title The concept the user typed, e.g. "Stoicism".
 * @returns A promise that resolves to the generated content.
 *
 * This is `async` (returns a Promise) on purpose: a real AI call takes
 * time, so the app awaits it and shows a loading spinner meanwhile.
 * Because it's already async, swapping in a real network call later
 * requires NO changes anywhere else in the app.
 */
export async function generateConcept(title: string): Promise<GeneratedContent> {
  // Simulate "thinking" time so the loading UI is visible (1.2s).
  await delay(1200);

  // If the title matches a concept in our built-in library, use that.
  const fromLibrary = findLibraryConcept(title);
  if (fromLibrary) return fromLibrary.content;

  // Otherwise, return solid generic content.
  // (This is the "long tail" that real AI will handle later.)
  return genericContent(title);
}

/* =============================================================
 * LATER: REAL CLAUDE AI (reference implementation)
 * -------------------------------------------------------------
 * For a real release, the Claude API key must NOT live in the app
 * (anyone can extract it). Put it on a tiny backend you control and
 * have the app call THAT. Then this function becomes:
 *
 *   const YOUR_BACKEND_URL = 'https://your-backend.example.com/generate';
 *
 *   export async function generateConcept(title: string): Promise<GeneratedContent> {
 *     const res = await fetch(YOUR_BACKEND_URL, {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify({ title }),
 *     });
 *     if (!res.ok) throw new Error('Generation failed');
 *     return (await res.json()) as GeneratedContent;
 *   }
 *
 * Your backend would call Claude with a prompt like:
 *
 *   "You are a philosophy tutor. For the concept "<title>", return JSON
 *    with keys: summary (one sentence), lesson (2-3 short paragraphs),
 *    keyIdeas (array of 4 strings), practicalPoints (array of 4 strings)."
 *
 * ...and enforce that JSON shape before sending it back to the app.
 * (See README.md → "Adding real AI" for a copy-pasteable backend.)
 * ============================================================= */
