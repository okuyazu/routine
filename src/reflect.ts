/**
 * reflect.ts
 * -------------------------------------------------------------
 * The questions behind "Reflect" (the Socratic companion). Socrates
 * taught by ASKING, never asserting — so these prompts never claim facts,
 * they invite the user to examine their own thinking about a concept.
 *
 * Each concept gets a short sequence following the classic Socratic
 * "moves": clarify -> apply -> challenge -> shift perspective -> trace
 * consequences. Flagship concepts have tailored questions; everything
 * else uses a solid generic set with the concept's name woven in.
 *
 * LATER (optional AI): swap `reflectionFor` to generate follow-up
 * questions that react to what the user just wrote. The screen and the
 * journal stay exactly the same.
 */

/** Tailored Socratic questions for our flagship concepts. */
const TAILORED: Record<string, string[]> = {
  Stoicism: [
    "Think of something stressing you right now. Which parts are truly in your control, and which aren't?",
    'When you last felt upset, what was the judgment behind the feeling — and was it actually true?',
    "Is there a situation where 'focus only on what you control' could become an excuse to give up too easily?",
    'Someone says Stoicism just teaches you to suppress emotion. How would you respond?',
    'If you did the Stoic evening review tonight, what would you ask yourself?',
  ],
  'Wu Wei': [
    'Where in your life are you forcing something that might go better if you eased off?',
    "Recall a moment when action felt effortless and you were 'in flow'. What made it possible?",
    "Could 'effortless action' be misread as an excuse for passivity? Where's the line for you?",
    'The Taoists praise water overcoming the hard by yielding. Where might yielding serve you better than pushing?',
    "What would it look like to 'wait for the right moment' in a decision you're facing now?",
  ],
  Existentialism: [
    "Name a choice you call 'I have to'. Is it really 'I choose to'? What changes if you say it that way?",
    'Which of your current goals are genuinely yours, and which were handed to you by others?',
    "Sartre says we're 'condemned to be free'. Does that freedom feel more exhilarating or more heavy — and why?",
    "Where might you be in 'bad faith' — hiding from a choice behind an excuse?",
    'If you fully owned that your actions define who you become, what would you do differently tomorrow?',
  ],
  Utilitarianism: [
    'Think of a recent decision. Who was affected, and how deeply, under each option?',
    "Is there a choice you made mainly for yourself that looks different when everyone's interests count equally?",
    "Where could 'the greatest good for the greatest number' unfairly trample one person's rights?",
    "Mill valued 'higher' pleasures over 'lower' ones. Do you agree some pleasures are worth more? Which?",
    'If you weighed the well-being of strangers as Peter Singer urges, what would you change?',
  ],
};

/** A strong generic Socratic sequence for any concept. */
function genericReflection(title: string): string[] {
  return [
    `In your own words, what does ${title} actually mean to you?`,
    `Where in your life right now could ${title} make a real difference?`,
    `Can you think of a situation where ${title} might mislead you or fall short?`,
    `What would a thoughtful person who disagrees with ${title} say?`,
    `If you fully lived by ${title} for a month, what would change?`,
    `How does ${title} connect to another idea or belief you already hold?`,
  ];
}

/** The reflection questions for a concept title. */
export function reflectionFor(title: string): string[] {
  const t = title.trim().toLowerCase();
  const key = Object.keys(TAILORED).find((k) => k.toLowerCase() === t);
  return key ? TAILORED[key] : genericReflection(title.trim());
}
