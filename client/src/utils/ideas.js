// Practice prompts for the "Generate idea" button on the record screen. A mix of
// one-word springboards, story prompts, opinion prompts, and do-something prompts
// so there's always a low-friction way to start talking. getRandomIdea() avoids
// repeating the one just shown.

const ONE_WORD = [
  'Water', 'Brother', 'Silence', 'Fear', 'Home', 'Coffee', 'Sunday', 'Luck',
  'The ocean', 'A closed door', 'Your name', 'Midnight', 'Rain', 'A promise',
  'The color red', 'Winning', 'Losing', 'A stranger', 'Growing up', 'Time',
];

const STORY = [
  'Pick a random photo from your camera roll and tell the story behind it.',
  'Tell the story of a scar, real or figurative.',
  'Describe the best meal you have ever had, in vivid detail.',
  'Talk about a moment you were proud of yourself.',
  'Recount the last time you were truly surprised.',
  'Walk me through your morning as if it were a scene in a film.',
  'Tell me about someone who changed how you see the world.',
];

const OPINION = [
  'Argue for something unpopular that you genuinely believe.',
  'Explain something you changed your mind about, and why.',
  'Convince me to try your favorite hobby.',
  'What is a rule everyone follows that you think is wrong?',
  'Defend a food, movie, or place that most people dislike.',
  'What advice would you give your younger self?',
];

const TEACH = [
  'Teach me something you learned this week.',
  'Explain how something you use every day actually works.',
  'Give me a 60-second crash course on a topic you know well.',
  'Explain your job or major to a curious ten-year-old.',
  'Pitch an app or business idea you would never actually build.',
];

const CATEGORIES = [
  { label: 'One word', items: ONE_WORD, hint: 'Talk about whatever this brings to mind.' },
  { label: 'Tell a story', items: STORY, hint: null },
  { label: 'Take a side', items: OPINION, hint: null },
  { label: 'Teach me', items: TEACH, hint: null },
];

// Flat pool with category attached, for weighted-ish variety.
const POOL = CATEGORIES.flatMap((c) => c.items.map((text) => ({ text, category: c.label, hint: c.hint })));

export function getRandomIdea(previousText) {
  let pick;
  do {
    pick = POOL[Math.floor(Math.random() * POOL.length)];
  } while (POOL.length > 1 && pick.text === previousText);
  return pick;
}
