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

/** Pretend the AI is "thinking" so we can see the loading state. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * A few richly written concepts so demos look great out of the box.
 * The key is a lowercase search term; if the user's title contains it,
 * we use this content.
 */
const CURATED: Record<string, GeneratedContent> = {
  stoicism: {
    summary:
      'An ancient philosophy of focusing only on what you control and meeting the rest with calm.',
    lesson:
      'Stoicism began in Athens around 300 BCE and was later shaped by figures like Epictetus, Seneca, and the Roman emperor Marcus Aurelius. Its central move is the "dichotomy of control": some things are up to us (our judgments, choices, and actions) and some are not (other people, outcomes, the past, our reputation). Suffering, the Stoics argued, comes not from events themselves but from our judgments about them.\n\nThe goal is not to suppress emotion but to train it — to want what actually happens, and to act with virtue (wisdom, courage, justice, self-control) regardless of results. If you give your best effort and the outcome goes badly, you have still done the only thing that was ever truly yours to do.',
    keyIdeas: [
      'Separate what you control (your choices) from what you don\'t (outcomes, others).',
      'Events are neutral; your judgments about them cause distress.',
      'Virtue — not success, wealth, or reputation — is the only true good.',
      'Prepare in advance for setbacks so they lose their power to shock you.',
    ],
    practicalPoints: [
      'Before a stressful event, ask: "What here is actually in my control?"',
      'When upset, name the judgment behind the feeling, then question it.',
      'Each morning, briefly rehearse difficulties you might meet that day.',
      'Each evening, review: where did I act with virtue, where did I slip?',
    ],
  },
  existentialism: {
    summary:
      'The view that life has no built-in meaning — so you are radically free, and responsible, to create your own.',
    lesson:
      'Existentialism is less a single doctrine than a shared starting point developed by thinkers such as Kierkegaard, Nietzsche, Sartre, and de Beauvoir. Sartre summarized it as "existence precedes essence": unlike a knife, which is made for a purpose, a human being simply exists first and must then decide what to become. There is no fixed human nature handing you your purpose.\n\nThat freedom is exhilarating and heavy. Because nothing outside you dictates your values, every choice is genuinely yours — and you cannot hide behind "I had no choice" (what Sartre called bad faith). Authenticity means owning that freedom, choosing deliberately, and accepting responsibility for the self you build through your actions.',
    keyIdeas: [
      'There is no pre-given meaning; you must create your own.',
      '"Existence precedes essence" — you define yourself through action.',
      'Radical freedom brings radical responsibility.',
      'Living authentically means refusing to hide behind excuses ("bad faith").',
    ],
    practicalPoints: [
      'Notice where you say "I have to" — often it\'s really "I choose to".',
      'Make one values-driven choice today that you\'d own even if it fails.',
      'Audit borrowed goals: which are truly yours, which were just handed to you?',
      'Treat each decision as a small vote for the person you\'re becoming.',
    ],
  },
  absurdism: {
    summary:
      'Albert Camus\' response to a meaningless universe: rebel, and live fully anyway.',
    lesson:
      'Camus described the "absurd" as the collision between our deep human craving for meaning and a silent, indifferent universe that offers none. He rejected two escapes: suicide (giving up on life) and blind faith or ideology (giving up on honest thinking). Both, he argued, dodge the tension rather than face it.\n\nHis alternative is revolt: to keep living, and to squeeze richness out of experience, precisely because there is no cosmic guarantee. In "The Myth of Sisyphus" he imagines the man condemned to roll a boulder uphill forever — and concludes "one must imagine Sisyphus happy," because Sisyphus owns his fate and finds meaning in the struggle itself.',
    keyIdeas: [
      'The "absurd" is the clash between our need for meaning and a silent universe.',
      'Don\'t escape it through despair or false certainty — face it honestly.',
      'Revolt: keep living fully and create value without cosmic guarantees.',
      '"One must imagine Sisyphus happy" — meaning is found in the struggle.',
    ],
    practicalPoints: [
      'Pursue things for their intrinsic joy, not just their outcome.',
      'When meaning feels absent, choose an act of "revolt": create, help, savor.',
      'Hold beliefs honestly — resist the comfort of easy certainty.',
      'Find the "happy Sisyphus" in a repetitive task by owning it fully.',
    ],
  },
  epicureanism: {
    summary:
      'The pursuit of a happy life through modest, lasting pleasures and freedom from fear.',
    lesson:
      'Epicurus taught that pleasure is the goal of life — but he meant something calmer than the modern word suggests. The highest pleasure is ataraxia: a tranquil mind free from anxiety, and a body free from pain. Wild indulgence actually undermines this, because it breeds craving, dependency, and regret.\n\nEpicurus argued that most fears are unnecessary. Death "is nothing to us," since when we exist death is not present, and when death is present we do not exist. By reducing desires to the natural and necessary (food, shelter, friendship, understanding) and letting go of empty ones (fame, luxury, power), we reach a stable, self-sufficient contentment.',
    keyIdeas: [
      'The aim is tranquility (ataraxia), not intense or constant stimulation.',
      'Distinguish natural, necessary desires from empty ones.',
      'Simple, repeatable pleasures beat rare, extravagant ones.',
      'Friendship and freedom from fear are among life\'s greatest goods.',
    ],
    practicalPoints: [
      'Before a purchase, ask: is this a natural need or an empty craving?',
      'Invest in friendships — Epicurus ranked them above luxury.',
      'Practice enjoying simple pleasures fully instead of chasing bigger ones.',
      'Name a fear, then examine whether it\'s truly worth the anxiety it costs.',
    ],
  },
};

/**
 * Build reasonable generic content for ANY concept the user types,
 * when we don't have a curated entry. It's templated, but written to
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

  // If the title matches one of our curated concepts, use that.
  const lower = title.toLowerCase();
  for (const key of Object.keys(CURATED)) {
    if (lower.includes(key)) return CURATED[key];
  }

  // Otherwise, return solid generic content.
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
