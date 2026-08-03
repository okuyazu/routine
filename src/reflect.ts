/**
 * reflect.ts
 * -------------------------------------------------------------
 * The questions behind "Reflect" (the Socratic companion). Socrates
 * taught by ASKING, never asserting — so these prompts never claim facts,
 * they invite the user to examine their own thinking.
 *
 * The aim is punch: concrete scenarios, real tension, a little surprise —
 * not textbook prompts. Every library concept has its own tailored set;
 * typed/AI concepts fall back to a sharpened generic set.
 *
 * LATER (optional AI): swap `reflectionFor` to generate follow-up
 * questions that react to what the user just wrote. The screen and the
 * journal stay exactly the same.
 */

/** Tailored Socratic questions, keyed by exact concept title. */
const TAILORED: Record<string, string[]> = {
  // --- Ancient Greek & Roman ---
  Stoicism: [
    "Picture the last time a rude comment ruined your afternoon. Whose behavior were you letting run your day?",
    "You do everything right and still miss the flight. In that moment, what's actually left that's yours?",
    "'It's out of my control' can bring peace — or be a cop-out. Where have you used it to stop trying?",
    "A friend says caring less about outcomes sounds cold and lifeless. Are they wrong? What would you say back?",
    "If tomorrow you judged nothing 'good' or 'bad' — only 'mine' or 'not mine' — which worry would quietly vanish?",
  ],
  Epicureanism: [
    "Think of your last impulse purchase. A week on, did it add calm — or just a moment's buzz?",
    "Natural and necessary, or empty? Name one craving of yours that fails Epicurus's test.",
    "He said death 'is nothing to us.' Sit with that for a second — does the fear ease, or does something resist?",
    "Modern life sells excitement as happiness. Where have you mistaken stimulation for real contentment?",
    "Cut your wants to food, shelter, friends, and understanding for a month. What would you miss — and what wouldn't you?",
  ],
  'The Socratic Method': [
    "Pick a belief you're certain about right now. How do you actually know it — or did you just inherit it?",
    "Define 'a good friend' in one sentence. Now find the exception that breaks your definition.",
    "When did a question — not an argument — last change your mind? What made it work?",
    "Whose false certainty around you would you most like to question? Why does it bother you?",
    "If admitting 'I don't know' begins wisdom, what's one thing you've been pretending to understand?",
  ],

  // --- Eastern ---
  'Wu Wei': [
    "Think of something you've been pushing with no progress. What would 'stop forcing it' look like tomorrow?",
    "Recall doing something hard that felt effortless. What were you NOT doing that usually gets in the way?",
    "Water wins by yielding. In a current conflict, where might giving way get you further than pushing?",
    "A friend says 'effortless action' is a fancy excuse for laziness. Where's your honest line between flow and avoidance?",
    "What decision are you rushing that might resolve itself if you waited for the right moment?",
  ],
  'The Four Noble Truths': [
    "Name a small suffering from today. Trace it back — what craving or 'it should be different' sat underneath it?",
    "What are you clinging to right now that some part of you senses you'll eventually have to release?",
    "This mood you're in is impermanent too. Does knowing that lighten it — or does part of you refuse?",
    "Some call this pessimistic. Is naming suffering honestly pessimism — or the first step to freedom?",
    "If you loosened your grip on one thing 'having to' go your way this week, what would change?",
  ],
  'Confucian Ren': [
    "Recall a small courtesy you did almost automatically today. Did it shape who you are, even a little?",
    "'Do not impose on others what you don't want yourself.' Where did you cross that line recently — even subtly?",
    "Character grows through relationships, not alone. Which relationship is quietly making you better — or worse?",
    "Is treating manners as moral practice wisdom, or just conformity? Where's the difference for you?",
    "Pick one tiny virtuous habit. Repeated daily until it's second nature — who would you become?",
  ],

  // --- Existential & Modern ---
  Existentialism: [
    "Say one thing you 'have to' do this week. Now say 'I choose to' instead. Which felt truer — and why did it sting?",
    "Whose dream are you chasing — genuinely yours, or one handed to you that you never questioned?",
    "'Condemned to be free.' Right now, does your freedom feel more like a gift or a weight?",
    "Where are you hiding behind 'that's just how I am'? What choice does that phrase let you dodge?",
    "If every action is a vote for who you're becoming, what did today's votes elect?",
  ],
  Absurdism: [
    "When did you last feel life was pointless? Honestly — what triggered it, and what did you do next?",
    "Camus says live fully anyway, without guarantees. What do you do purely because you love it, not for a payoff?",
    "He rejected both despair and false certainty as escapes. Which one do YOU reach for when meaning runs thin?",
    "'Imagine Sisyphus happy' pushing his rock forever. What repetitive part of your life could you own that way?",
    "If no cosmic meaning is coming, does that free you or crush you? Sit with which — and why.",
  ],
  Nihilism: [
    "Ever felt nothing really matters? Look closely — was that a truth, or exhaustion or grief wearing its mask?",
    "There's a gap between 'no given meaning' and 'no possible meaning.' Which have you actually lived?",
    "If you truly believed nothing mattered, what would you stop doing? Notice what you'd keep doing anyway.",
    "Nietzsche saw nihilism as a doorway, not a home. If it's a doorway for you, what's on the other side?",
    "Name one thing you act as if it matters, without proof that it 'objectively' does. Why that one?",
  ],
  'Amor Fati': [
    "Recall your worst recent setback. Can you find one thing it made possible that wouldn't exist otherwise?",
    "Not 'accept' — love it. Is there one hard event you could honestly call 'this too belongs to my life'?",
    "Could you relive your exact life, endlessly, and still say yes? Which part makes you hesitate?",
    "Isn't loving suffering a kind of denial? Where's the line between amor fati and excusing what hurt you?",
    "If you embraced everything that's happened as necessary, which resentment would you finally set down?",
  ],

  // --- Ethics ---
  Utilitarianism: [
    "Think of a decision this week. List who it affected and how much. Did you weigh them — or mostly yourself?",
    "Flip a switch to save five strangers but harm one? Does your gut agree with your math — and which do you trust?",
    "'Greatest good for the greatest number' can crush one person for the many. Where does that logic start to scare you?",
    "Mill ranked some pleasures 'higher' than others. Do you secretly rank them too? By what right?",
    "Singer says a distant stranger's suffering counts as much as your neighbor's. Live that fully — what changes tomorrow?",
  ],
  "Kant's Categorical Imperative": [
    "Think of a small lie you told recently. Now imagine EVERYONE told it, always. Would it still work?",
    "Never use a person merely as a means. Where have you treated someone as just useful to you?",
    "You could break a promise with zero consequences. Kant says still wrong. Do you agree — or is that too rigid?",
    "Apply 'what if everyone did this?' to one thing you do but wish others wouldn't. Uncomfortable?",
    "Is a kind act done from cold duty worth more, less, or the same as one done from warm feeling? What's your view?",
  ],
};

/** A sharpened generic Socratic sequence for any concept. */
function genericReflection(title: string): string[] {
  return [
    `Forget the textbook. In one honest sentence, what does ${title} actually mean to you?`,
    `Where this week would ${title} change what you DO — not just what you think?`,
    `Every strong idea has a dark side. Where might ${title} mislead you, or become an excuse?`,
    `Picture someone who thinks ${title} is nonsense. What's their best point — and can you answer it?`,
    `Live by ${title} completely for a month. What's the first thing that would change?`,
    `Where does ${title} clash with something else you believe? Which one gives way?`,
  ];
}

/** The reflection questions for a concept title. */
export function reflectionFor(title: string): string[] {
  const t = title.trim().toLowerCase();
  const key = Object.keys(TAILORED).find((k) => k.toLowerCase() === t);
  return key ? TAILORED[key] : genericReflection(title.trim());
}
