/**
 * library.ts
 * =============================================================
 * THE BUILT-IN LIBRARY of hand-written philosophy concepts.
 *
 * This is what makes the app genuinely useful WITHOUT any AI:
 * a curated catalog of great concepts, each with a lesson, key
 * ideas, practical points, AND flashcards for quiz mode.
 *
 * `ai.ts` checks this library first. Real AI (later) only handles
 * concepts that AREN'T in here — the "long tail".
 *
 * Want to grow the app? Just add another entry to LIBRARY below.
 * =============================================================
 */

import { GeneratedContent, Flashcard, DeepDiveSection } from './types';

/** One entry in the built-in library. */
export type LibraryConcept = {
  /** Display title, e.g. "Stoicism". */
  title: string;
  /** Which philosophical tradition it belongs to (used for grouping). */
  tradition: string;
  /** The lesson / key ideas / practical points (FREE for everyone). */
  content: GeneratedContent;
  /** Flashcards used by quiz mode. */
  flashcards: Flashcard[];
  /**
   * PREMIUM "deep dive" sections (optional). Concepts with this authored
   * show a "Go Deeper" section, locked until the user unlocks premium.
   */
  deepDive?: DeepDiveSection[];
};

/**
 * The order traditions are shown in on the Library screen.
 * (Every concept's `tradition` should be one of these.)
 */
export const TRADITIONS: string[] = [
  'Ancient Greek & Roman',
  'Eastern',
  'Existential & Modern',
  'Ethics',
];

export const LIBRARY: LibraryConcept[] = [
  // ----------------------------- Ancient Greek & Roman
  {
    title: 'Stoicism',
    tradition: 'Ancient Greek & Roman',
    content: {
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
    flashcards: [
      {
        front: 'What is the Stoic "dichotomy of control"?',
        back: 'The distinction between what is up to us (our judgments, choices, actions) and what is not (outcomes, other people, the past).',
      },
      {
        front: 'According to Stoicism, what actually causes our suffering?',
        back: 'Not events themselves, but our judgments about them.',
      },
      {
        front: 'What do Stoics consider the only true good?',
        back: 'Virtue — wisdom, courage, justice, and self-control — not wealth, success, or reputation.',
      },
    ],
    deepDive: [
      {
        heading: 'Origins & History',
        body: 'Stoicism was founded by Zeno of Citium around 300 BCE, who taught from the Stoa Poikile (the "painted porch") in Athens — the source of the name. Cleanthes and Chrysippus systematized its logic and physics. Centuries later it took root in Rome, where its most famous voices emerged: the freed-slave teacher Epictetus, the statesman Seneca, and the emperor Marcus Aurelius.',
      },
      {
        heading: 'Key Thinkers',
        body: 'Epictetus (c. 50–135 CE) taught the dichotomy of control; his student recorded the "Enchiridion" (handbook). Seneca (c. 4 BCE–65 CE) wrote practical letters on anger, grief, and the shortness of life. Marcus Aurelius (121–180 CE) wrote the "Meditations" as private notes to himself during military campaigns — never meant for publication.',
      },
      {
        heading: 'In Their Words',
        body: '"You have power over your mind — not outside events. Realize this, and you will find strength." — Marcus Aurelius\n\n"We suffer more often in imagination than in reality." — Seneca\n\n"It is not what happens to you, but how you react to it that matters." — Epictetus',
      },
      {
        heading: 'Objections & Replies',
        body: 'Critics charge Stoicism with cold detachment — if nothing external should move you, do you stop caring? Stoics reply that they aim not to kill emotion but to free it from false judgments; you can love deeply while accepting you do not control outcomes. Others say "focus on what you control" excuses passivity toward injustice — but Stoics counted just action itself among the things in our power, and several were active reformers.',
      },
      {
        heading: 'Practicing It Deeply',
        body: 'Try the "view from above" (picture your troubles from a cosmic distance), negative visualization (premeditatio malorum — briefly imagining loss to build gratitude and resilience), and Epictetus\'s morning preparation and evening review. Keep a "Meditations"-style journal addressed to yourself.',
      },
    ],
  },
  {
    title: 'Epicureanism',
    tradition: 'Ancient Greek & Roman',
    content: {
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
    flashcards: [
      {
        front: 'What is "ataraxia"?',
        back: 'A tranquil mind free from anxiety (and a body free from pain) — the highest Epicurean pleasure.',
      },
      {
        front: 'How did Epicurus classify desires?',
        back: 'Natural and necessary versus empty — pursue the former, let go of the latter.',
      },
      {
        front: "What was Epicurus's view of death?",
        back: '"Death is nothing to us" — when we exist it is absent, and when it is present we no longer exist.',
      },
    ],
  },
  {
    title: 'The Socratic Method',
    tradition: 'Ancient Greek & Roman',
    content: {
      summary:
        "Socrates's way of pursuing truth through relentless, humble questioning.",
      lesson:
        'Socrates left no writings; we know him mainly through Plato\'s dialogues. His method — the elenchus — is a form of cooperative argument by questioning. Rather than lecturing, Socrates would ask someone to define a term (justice, courage, piety), then probe the definition with further questions until its contradictions surfaced, clearing the ground for a better understanding.\n\nUnderlying it is Socratic humility: "I know that I know nothing." The goal is not to win but to expose false certainty and move closer to truth. The examined life, Socrates insisted, is the only one worth living — and questioning is how we examine it.',
      keyIdeas: [
        'Truth is pursued through disciplined questioning, not assertion.',
        'Probing a definition reveals its hidden contradictions.',
        'Socratic humility: real wisdom begins in admitting ignorance.',
        '"The unexamined life is not worth living."',
      ],
      practicalPoints: [
        'When you hold a strong opinion, ask: "how do I actually know this?"',
        'Define your key terms precisely before arguing about them.',
        'Question in order to understand, not to win the exchange.',
        'Welcome having a belief refuted — it is progress, not defeat.',
      ],
    },
    flashcards: [
      {
        front: 'What is the Socratic "elenchus"?',
        back: 'Cooperative argument by questioning — probing a definition until its contradictions surface.',
      },
      {
        front: 'What did Socrates mean by "I know that I know nothing"?',
        back: 'Wisdom begins with humility — recognizing the limits of your own knowledge.',
      },
      {
        front: 'Why question rather than lecture?',
        back: 'To expose false certainty and move both people closer to truth, rather than to win.',
      },
    ],
  },

  // ----------------------------- Eastern
  {
    title: 'Wu Wei',
    tradition: 'Eastern',
    content: {
      summary:
        "The Taoist art of 'effortless action' — achieving more by forcing less and moving with the natural flow.",
      lesson:
        'Wu Wei (literally "non-doing") is a central idea in Taoism, especially the Tao Te Ching of Laozi and the writings of Zhuangzi. It does not mean laziness or passivity. It means acting in harmony with the natural course of things (the Tao) rather than straining against it — like a skilled swimmer who works with the current instead of fighting it.\n\nThe image the Taoists loved was water: soft, yielding, and seemingly weak, yet it carves canyons and wears down stone. Wu Wei is the state of the craftsperson so absorbed in their work that action becomes spontaneous and unforced. By dropping ego-driven striving and over-control, we often accomplish more, with far less friction.',
      keyIdeas: [
        'Wu Wei means "effortless action", not inaction or laziness.',
        'Act with the natural flow of things rather than forcing outcomes.',
        'Like water, yielding and softness can overcome the rigid and hard.',
        'Over-control and ego-striving often create the very friction they fight.',
      ],
      practicalPoints: [
        'Notice where you\'re forcing a result; try easing off and observing.',
        'In a skill you know well, let action become spontaneous — stop over-thinking.',
        'Choose the path of least resistance that still honors your aim.',
        'When stuck, wait for the right moment instead of pushing prematurely.',
      ],
    },
    flashcards: [
      {
        front: 'What does "Wu Wei" literally mean, and what does it NOT mean?',
        back: '"Non-doing" or "effortless action" — it does not mean laziness or passivity, but acting in harmony with the natural flow.',
      },
      {
        front: 'What natural element did the Taoists use to illustrate Wu Wei?',
        back: 'Water — soft and yielding, yet it overcomes the hard and rigid over time.',
      },
      {
        front: 'How can doing less sometimes achieve more?',
        back: 'Dropping ego-driven striving and over-control lets action become unforced, working with circumstances instead of against them.',
      },
    ],
    deepDive: [
      {
        heading: 'Origins & History',
        body: 'Wu Wei is a cornerstone of philosophical Taoism, expressed in the Tao Te Ching (attributed to the semi-legendary Laozi, c. 6th century BCE) and the parables of Zhuangzi (4th century BCE). It also shaped Chinese statecraft — the ideal ruler governs by not-interfering — and later flowed into Chan (Zen) Buddhism.',
      },
      {
        heading: 'Key Thinkers',
        body: 'Laozi\'s Tao Te Ching presents wu wei as alignment with the Tao, the underlying way of things. Zhuangzi illustrates it through vivid stories: Cook Ding, whose blade never dulls because he cuts along the natural gaps in the ox; and the "useless" tree that survives precisely because it is not exploited.',
      },
      {
        heading: 'In Their Words',
        body: '"The Tao does nothing, and yet nothing is left undone." — Tao Te Ching\n\n"Water is the softest of all things, yet it overcomes the hard and the strong." — Tao Te Ching\n\n"Flow with whatever may happen and let your mind be free." — Zhuangzi',
      },
      {
        heading: 'Objections & Replies',
        body: 'Doesn\'t wu wei just justify laziness or fatalism? The Taoist reply: it is skilled responsiveness, not inaction. Cook Ding is highly trained; his effortlessness is the fruit of deep attunement, not indifference. Wu wei is closer to the modern idea of "flow" than to passivity.',
      },
      {
        heading: 'Practicing It Deeply',
        body: 'Cultivate flow by matching challenge to skill and removing self-conscious control. Notice where forcing creates resistance, and experiment with yielding. Study the Cook Ding parable as a model of mastery, and practice timing — acting when conditions are ripe rather than pushing against them.',
      },
    ],
  },
  {
    title: 'The Four Noble Truths',
    tradition: 'Eastern',
    content: {
      summary:
        "Buddhism's core diagnosis of suffering — and its prescription for freedom from it.",
      lesson:
        'The Four Noble Truths are the foundation of Buddhist thought, said to be the content of the Buddha\'s first teaching. They are structured like a physician\'s diagnosis: (1) Dukkha — life inevitably involves suffering, dissatisfaction, and impermanence; (2) Samudaya — this suffering arises from craving and attachment, our grasping for things to be other than they are; (3) Nirodha — suffering can cease when craving is released; (4) Magga — the way to that release is the Eightfold Path, a practical program of ethical conduct, mental discipline, and wisdom.\n\nThe insight is not pessimism but realism paired with hope: suffering is acknowledged honestly, but it has a cause, and therefore a cure.',
      keyIdeas: [
        'Life inevitably contains suffering and dissatisfaction (dukkha).',
        'Suffering is caused by craving and attachment (samudaya).',
        'Releasing craving brings the end of suffering (nirodha).',
        'The Eightfold Path is the practical route to that freedom (magga).',
      ],
      practicalPoints: [
        'When distressed, look for the craving or attachment underneath it.',
        'Practice noticing impermanence — that feelings and situations pass.',
        'Loosen your grip on how things "should" be, even slightly.',
        'Bring more awareness to one daily activity as a start on the path.',
      ],
    },
    flashcards: [
      {
        front: 'What are the Four Noble Truths, in one line each?',
        back: '1) Suffering exists; 2) it is caused by craving; 3) it can cease; 4) the Eightfold Path is the way to end it.',
      },
      {
        front: 'According to Buddhism, what is the root cause of suffering?',
        back: 'Craving and attachment — grasping for things to be other than they are.',
      },
      {
        front: "Why is the framework compared to a doctor's approach?",
        back: 'It diagnoses the illness (suffering), its cause (craving), the cure (cessation), and the treatment (the path).',
      },
    ],
  },
  {
    title: 'Confucian Ren',
    tradition: 'Eastern',
    content: {
      summary:
        "Confucius's ideal of 'ren' — humaneness cultivated through relationships, ritual, and character.",
      lesson:
        'Ren (often translated "humaneness", "benevolence", or "goodness") is the central virtue in Confucian philosophy. For Confucius, becoming fully human is not automatic — it is a lifelong project of self-cultivation carried out within our relationships: family, friends, community, and state. We become good by practicing good conduct, especially through li (ritual, propriety, and respectful custom) that shapes character the way a riverbed shapes water.\n\nA famous expression of ren is Confucius\'s version of the Golden Rule: "Do not impose on others what you do not wish for yourself." Virtue here is relational and practical — shown in how you treat your parents, your neighbors, and strangers, not in abstract belief.',
      keyIdeas: [
        'Ren is humaneness or benevolence — the central Confucian virtue.',
        'Becoming good is a lifelong project of self-cultivation.',
        'Character is formed through relationships and ritual propriety (li).',
        '"Do not impose on others what you do not wish for yourself."',
      ],
      practicalPoints: [
        'Treat everyday courtesies as character practice, not empty formality.',
        'Invest in your key relationships as the ground of a good life.',
        'Before acting, ask whether you\'d accept the same treatment yourself.',
        'Pick one small virtuous habit and repeat it until it\'s second nature.',
      ],
    },
    flashcards: [
      {
        front: 'What does "ren" mean in Confucian philosophy?',
        back: 'Humaneness, benevolence, or goodness — the central virtue, cultivated through relationships.',
      },
      {
        front: 'What is "li" and why does it matter?',
        back: 'Ritual, propriety, and respectful custom — practicing it gradually shapes moral character.',
      },
      {
        front: "State Confucius's version of the Golden Rule.",
        back: '"Do not impose on others what you do not wish for yourself."',
      },
    ],
  },

  // ----------------------------- Existential & Modern
  {
    title: 'Existentialism',
    tradition: 'Existential & Modern',
    content: {
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
    flashcards: [
      {
        front: 'What does "existence precedes essence" mean?',
        back: 'Humans exist first with no fixed purpose, then define themselves through their choices and actions.',
      },
      {
        front: 'What is "bad faith" for Sartre?',
        back: 'Hiding from your own freedom behind excuses — pretending you had no choice.',
      },
      {
        front: 'Why does radical freedom bring responsibility?',
        back: 'Since nothing outside you dictates your values, every choice is genuinely yours to own.',
      },
    ],
    deepDive: [
      {
        heading: 'Origins & History',
        body: 'The 19th-century Danish thinker Søren Kierkegaard is often called the father of existentialism, with Nietzsche as a second root. It flowered in mid-20th-century France — shaped by the upheaval of two world wars — through Jean-Paul Sartre, Simone de Beauvoir, and (adjacent to the label) Albert Camus. Martin Heidegger deeply influenced it, though he rejected the term.',
      },
      {
        heading: 'Key Thinkers',
        body: 'Kierkegaard explored anxiety, despair, and the "leap of faith". Sartre gave the movement its slogans in "Being and Nothingness" (bad faith, radical freedom). Simone de Beauvoir extended it into ethics and feminism in "The Ethics of Ambiguity" and "The Second Sex". Heidegger examined authentic existence and "being-toward-death".',
      },
      {
        heading: 'In Their Words',
        body: '"Man is condemned to be free." — Sartre\n\n"One is not born, but rather becomes, a woman." — Simone de Beauvoir\n\n"Anxiety is the dizziness of freedom." — Kierkegaard',
      },
      {
        heading: 'Objections & Replies',
        body: 'Isn\'t existentialism bleak and self-absorbed? De Beauvoir answered that my freedom is bound up with everyone else\'s — to will my own freedom authentically is to will theirs, which grounds a genuine ethics. Critics also say "radical freedom" ignores real constraints of biology and society; later existentialists emphasized freedom as always "situated" within a concrete situation.',
      },
      {
        heading: 'Practicing It Deeply',
        body: 'Hunt for "bad faith" in your own life — the stories that let you deny your freedom ("that\'s just who I am", "I had no choice"). Clarify the projects that actually define you, and choose them deliberately. Sit with the anxiety of freedom rather than numbing it; treat it as the felt sign that a real choice is yours to make.',
      },
    ],
  },
  {
    title: 'Absurdism',
    tradition: 'Existential & Modern',
    content: {
      summary:
        "Albert Camus' response to a meaningless universe: rebel, and live fully anyway.",
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
    flashcards: [
      {
        front: 'What is "the absurd" according to Camus?',
        back: 'The clash between our craving for meaning and a silent, indifferent universe.',
      },
      {
        front: 'What two "escapes" from the absurd did Camus reject?',
        back: 'Suicide (giving up on life) and blind faith or ideology (giving up on honest thinking).',
      },
      {
        front: 'What does "one must imagine Sisyphus happy" mean?',
        back: 'Meaning is found in owning and embracing the struggle itself, not in any final result.',
      },
    ],
  },
  {
    title: 'Nihilism',
    tradition: 'Existential & Modern',
    content: {
      summary:
        'The unsettling claim that life has no inherent meaning, value, or purpose.',
      lesson:
        'Nihilism (from the Latin nihil, "nothing") is the view that life lacks objective meaning, purpose, or intrinsic value — and often that objective morality and knowledge are groundless too. Nietzsche diagnosed the "death of God" as ushering in a crisis of nihilism for Western culture: once traditional foundations lose their grip, values can seem to hang on nothing.\n\nNietzsche saw nihilism as a danger to pass through, not a resting place. The challenge it poses — if nothing is given, what now? — is exactly what existentialism and absurdism try to answer. Understanding nihilism clearly is the doorway to those responses.',
      keyIdeas: [
        'Nihilism denies inherent meaning, value, or purpose in life.',
        'Nietzsche linked it to the collapse of traditional foundations ("death of God").',
        'It is best understood as a crisis to move through, not a destination.',
        'The question it raises — "what now?" — sets up existentialism\'s answer.',
      ],
      practicalPoints: [
        'Distinguish "no given meaning" from "no possible meaning" — they differ.',
        'Notice where a felt meaninglessness is really burnout or grief in disguise.',
        'Use the question "what now?" as a prompt to choose your own values.',
        'Read nihilism as the start of a conversation, not the end of one.',
      ],
    },
    flashcards: [
      {
        front: 'What does nihilism claim?',
        back: 'That life has no inherent meaning, purpose, or intrinsic value (often also no objective morality).',
      },
      {
        front: 'How did Nietzsche relate nihilism to the "death of God"?',
        back: 'The collapse of traditional foundations leaves values ungrounded, triggering a cultural crisis of meaning.',
      },
      {
        front: "Why isn't nihilism the end of the story?",
        back: 'It poses the question "what now?", which existentialism and absurdism try to answer.',
      },
    ],
  },
  {
    title: 'Amor Fati',
    tradition: 'Existential & Modern',
    content: {
      summary:
        "Nietzsche's 'love of fate' — embracing everything that happens, even suffering, as necessary.",
      lesson:
        'Amor fati, Latin for "love of fate", is Nietzsche\'s formula for greatness. He wrote that he wanted to learn to see as beautiful what is necessary in things, and eventually "to say Yes" to all of life — not merely to tolerate what happens, but to love it, including the painful and the ugly, as part of an inseparable whole.\n\nHe paired it with the thought experiment of eternal recurrence: if you had to live your exact life over and over, endlessly, would you be crushed — or could you affirm it? Amor fati is the attitude of the person who could joyfully say "yes" — who wants nothing to be other than it is, forward or back.',
      keyIdeas: [
        'Amor fati means "love of fate" — affirming all of life, not just the good parts.',
        'It goes beyond acceptance to active embrace, even of suffering.',
        'Eternal recurrence tests whether you could affirm your life endlessly.',
        'Affirmation, for Nietzsche, is the mark of strength and flourishing.',
      ],
      practicalPoints: [
        'Reframe a setback by asking what it makes possible, not just what it cost.',
        'Practice saying "this too belongs to my life" about hard events.',
        'Use the recurrence test: would I choose to relive this moment?',
        'Aim beyond mere acceptance toward genuine affirmation of your path.',
      ],
    },
    flashcards: [
      {
        front: 'What does "amor fati" mean?',
        back: '"Love of fate" — embracing everything that happens, including suffering, as necessary and even beautiful.',
      },
      {
        front: 'How does amor fati differ from mere acceptance?',
        back: 'It is active embrace and affirmation — loving what is, not just tolerating it.',
      },
      {
        front: 'What is the "eternal recurrence" test?',
        back: 'Imagining living your exact life over and over forever, and asking whether you could joyfully affirm it.',
      },
    ],
  },

  // ----------------------------- Ethics
  {
    title: 'Utilitarianism',
    tradition: 'Ethics',
    content: {
      summary:
        'The ethical theory that the right action is the one producing the greatest good for the greatest number.',
      lesson:
        'Utilitarianism, developed by Jeremy Bentham and John Stuart Mill, is a form of consequentialism: what makes an action right or wrong is its consequences — specifically how much well-being (happiness, or reduced suffering) it produces. The guiding principle is to maximize overall utility: "the greatest happiness for the greatest number", counting everyone\'s interests impartially.\n\nIts strengths are clarity and fairness: it takes everyone\'s suffering seriously and gives a concrete way to weigh options. Its famous problems are that it can seem to justify sacrificing an individual for the many, and that consequences are hard to predict and measure. Mill refined it by arguing that higher (intellectual, moral) pleasures count for more than lower ones.',
      keyIdeas: [
        'Rightness depends on consequences, measured as overall well-being.',
        'Aim for "the greatest happiness for the greatest number".',
        'Everyone\'s interests count equally and impartially.',
        'Key objections: it can justify sacrificing individuals; outcomes are hard to predict.',
      ],
      practicalPoints: [
        'For a tough choice, list who is affected and how much, on each option.',
        'Check your decision from an impartial view, not just your own gain.',
        'Watch for cases where "the greater good" would trample a person\'s rights.',
        'Weigh not just how many are affected, but how deeply.',
      ],
    },
    flashcards: [
      {
        front: 'What is the core principle of utilitarianism?',
        back: 'The right action produces the greatest happiness (well-being) for the greatest number.',
      },
      {
        front: 'Who were its main founders?',
        back: 'Jeremy Bentham and John Stuart Mill.',
      },
      {
        front: "What's a famous objection to utilitarianism?",
        back: 'It can seem to justify sacrificing an individual for the benefit of the majority.',
      },
    ],
    deepDive: [
      {
        heading: 'Origins & History',
        body: 'Utilitarianism was given systematic form by Jeremy Bentham (1748–1832), who proposed a "hedonic calculus" to weigh pleasures and pains and used it to argue for legal and prison reform. John Stuart Mill (1806–1873), raised on Bentham\'s ideas, refined the theory. In the 20th century Henry Sidgwick sharpened it, and Peter Singer extended it to animals and global poverty.',
      },
      {
        heading: 'Key Thinkers',
        body: 'Bentham measured pleasure by quantity alone ("the quantity of pleasure being equal, push-pin is as good as poetry"). Mill disagreed, ranking "higher" intellectual and moral pleasures above "lower" ones. Peter Singer applies the principle today through effective altruism and the idea of an expanding moral circle.',
      },
      {
        heading: 'In Their Words',
        body: '"It is the greatest happiness of the greatest number that is the measure of right and wrong." — Bentham\n\n"It is better to be a human being dissatisfied than a pig satisfied; better to be Socrates dissatisfied than a fool satisfied." — Mill',
      },
      {
        heading: 'Objections & Replies',
        body: 'The sharpest objections concern justice: could utilitarianism justify framing an innocent person to satisfy a mob? And it can seem impossibly demanding — must I give until I am nearly as badly off as those I help (Singer says close to yes)? "Rule utilitarianism" replies that following rules which generally maximize welfare (like "do not punish the innocent") yields better outcomes than judging each act in isolation.',
      },
      {
        heading: 'Practicing It Deeply',
        body: 'For real decisions, list everyone affected and weigh both how many and how deeply. Notice the difference between "act" utilitarianism (judge each act) and "rule" utilitarianism (follow welfare-maximizing rules). Explore effective altruism as a modern application: doing the most good per unit of effort or money.',
      },
    ],
  },
  {
    title: "Kant's Categorical Imperative",
    tradition: 'Ethics',
    content: {
      summary:
        "Kant's test for moral duty: act only on principles you could will everyone to follow.",
      lesson:
        'Immanuel Kant grounded morality not in consequences but in reason and duty. The categorical imperative is his supreme moral principle — "categorical" because it commands unconditionally, regardless of your desires. Its best-known formulation: "Act only according to that maxim whereby you can at the same time will that it should become a universal law." If the rule behind your action couldn\'t be universalized without contradiction, it is wrong.\n\nA second formulation is the "formula of humanity": always treat people as ends in themselves, never merely as means. For Kant, lying or exploiting others fails both tests — you couldn\'t will universal lying (it would destroy the trust that makes lying possible), and you would be using the other person as a mere tool.',
      keyIdeas: [
        'Morality is based on reason and duty, not on consequences.',
        'Act only on maxims you could will to become universal laws.',
        'Always treat people as ends in themselves, never merely as means.',
        'Moral commands are "categorical" — unconditional, not dependent on desire.',
      ],
      practicalPoints: [
        'Before acting, ask: "what if everyone did this?"',
        'Check whether your plan uses someone merely as a tool for your ends.',
        'Keep commitments even when breaking one would be convenient.',
        'Separate "is this allowed for me?" from "would I accept it as a universal rule?"',
      ],
    },
    flashcards: [
      {
        front: 'State the first formulation of the categorical imperative.',
        back: '"Act only according to that maxim whereby you can at the same time will that it should become a universal law."',
      },
      {
        front: 'What is the "formula of humanity"?',
        back: 'Always treat people as ends in themselves, never merely as means.',
      },
      {
        front: "How does Kant's basis for morality differ from utilitarianism?",
        back: 'Kant grounds morality in reason and duty, not in consequences or outcomes.',
      },
    ],
  },
];

/** Normalize a title for loose matching ("The Socratic Method" ~ "socratic method"). */
function normalize(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Find a library concept whose title loosely matches what the user typed.
 * Matches if either title contains the other (case-insensitive), so
 * "wu wei", "Wu Wei", and "the wu wei idea" all find the Wu Wei entry.
 */
export function findLibraryConcept(title: string): LibraryConcept | undefined {
  const t = normalize(title);
  if (!t) return undefined;
  return LIBRARY.find((c) => {
    const lib = normalize(c.title);
    return t.includes(lib) || lib.includes(t);
  });
}

/** Get the flashcards for a title if it's in the library, else an empty list. */
export function flashcardsForTitle(title: string): Flashcard[] {
  return findLibraryConcept(title)?.flashcards ?? [];
}

/** Get the premium deep-dive sections for a title, if any exist. */
export function deepDiveForTitle(title: string): DeepDiveSection[] | undefined {
  return findLibraryConcept(title)?.deepDive;
}
