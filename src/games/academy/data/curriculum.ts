import type { Unit, Tile } from "../types";

export const UNITS: Unit[] = [
  {
    id: "unit-1",
    order: 1,
    title: "Word Origins",
    description: "Learn Greek and Latin roots to build your vocabulary",
    color: "#58cc02",
    tiles: [
      {
        id: "tile-1-1",
        type: "star",
        title: "Greek Roots",
        description: "Match common Greek roots to their meanings",
        exercises: [
          {
            id: "ex-gr-1",
            type: "SELECT_1_OF_3",
            question: 'What does the Greek root "bio-" mean?',
            correctAnswer: "life",
            choices: [
              { id: "a", text: "life", icon: "🧬" },
              { id: "b", text: "earth", icon: "🌍" },
              { id: "c", text: "water", icon: "💧" },
            ],
          },
          {
            id: "ex-gr-2",
            type: "SELECT_1_OF_3",
            question: 'What does the Greek root "geo-" mean?',
            correctAnswer: "earth",
            choices: [
              { id: "a", text: "life", icon: "🧬" },
              { id: "b", text: "earth", icon: "🌍" },
              { id: "c", text: "sound", icon: "🔊" },
            ],
          },
          {
            id: "ex-gr-3",
            type: "SELECT_1_OF_3",
            question: 'What does the Greek root "chron-" mean?',
            correctAnswer: "time",
            choices: [
              { id: "a", text: "light", icon: "💡" },
              { id: "b", text: "time", icon: "⏰" },
              { id: "c", text: "fire", icon: "🔥" },
            ],
          },
          {
            id: "ex-gr-4",
            type: "SELECT_1_OF_3",
            question: 'What does the Greek root "phon-" mean?',
            correctAnswer: "sound",
            choices: [
              { id: "a", text: "sound", icon: "🔊" },
              { id: "b", text: "water", icon: "💧" },
              { id: "c", text: "life", icon: "🧬" },
            ],
          },
        ],
      },
      {
        id: "tile-1-2",
        type: "book",
        title: "Latin Prefixes",
        description: "Match common Latin prefixes to their meanings",
        exercises: [
          {
            id: "ex-lp-1",
            type: "SELECT_1_OF_3",
            question: 'What does the prefix "pre-" mean?',
            correctAnswer: "before",
            choices: [
              { id: "a", text: "after", icon: "⏩" },
              { id: "b", text: "before", icon: "⏪" },
              { id: "c", text: "against", icon: "⚔️" },
            ],
          },
          {
            id: "ex-lp-2",
            type: "SELECT_1_OF_3",
            question: 'What does the prefix "sub-" mean?',
            correctAnswer: "under",
            choices: [
              { id: "a", text: "above", icon: "⬆️" },
              { id: "b", text: "across", icon: "↔️" },
              { id: "c", text: "under", icon: "⬇️" },
            ],
          },
          {
            id: "ex-lp-3",
            type: "SELECT_1_OF_3",
            question: 'What does the prefix "trans-" mean?',
            correctAnswer: "across",
            choices: [
              { id: "a", text: "across", icon: "↔️" },
              { id: "b", text: "under", icon: "⬇️" },
              { id: "c", text: "before", icon: "⏪" },
            ],
          },
          {
            id: "ex-lp-4",
            type: "SELECT_1_OF_3",
            question: 'What does the prefix "post-" mean?',
            correctAnswer: "after",
            choices: [
              { id: "a", text: "before", icon: "⏪" },
              { id: "b", text: "after", icon: "⏩" },
              { id: "c", text: "across", icon: "↔️" },
            ],
          },
        ],
      },
      {
        id: "tile-1-3",
        type: "dumbbell",
        title: "Word Building",
        description: "Use roots and prefixes to build words",
        exercises: [
          {
            id: "ex-wb-1",
            type: "WRITE_IN_ENGLISH",
            question: "Build a word meaning 'the study of life'",
            correctAnswer: "biology",
            wordBank: ["ology", "bio", "geo", "chron", "graphy"],
          },
          {
            id: "ex-wb-2",
            type: "WRITE_IN_ENGLISH",
            question: "Build a word meaning 'the study of the earth'",
            correctAnswer: "geology",
            wordBank: ["ology", "bio", "geo", "pre", "graphy"],
          },
          {
            id: "ex-wb-3",
            type: "WRITE_IN_ENGLISH",
            question: "Build a word meaning 'to see something before it happens'",
            correctAnswer: "preview",
            wordBank: ["pre", "post", "sub", "view", "logy"],
          },
        ],
      },
    ],
  },
  ...createExpandedUnits(),
];

/**
 * The expansion is deliberately organized as short, teach-practice-apply loops.
 * Every unit has three tiles: two retrieval-practice lessons and one word-building
 * application, so the existing lesson player can deliver all of the content.
 */
function select(id: string, question: string, correctAnswer: string, distractors: string[]) {
  return {
    id,
    type: "SELECT_1_OF_3" as const,
    question,
    correctAnswer,
    choices: [
      { id: "a", text: correctAnswer },
      { id: "b", text: distractors[0] },
      { id: "c", text: distractors[1] },
    ],
  };
}

function build(id: string, question: string, correctAnswer: string, wordBank: string[]) {
  return { id, type: "WRITE_IN_ENGLISH" as const, question, correctAnswer, wordBank };
}

function createExpandedUnits(): Unit[] {
  const units = [
    {
      title: "Vocabulary in Context",
      description: "Use clues around a word to unlock its meaning",
      color: "#14B8A6",
      tiles: [
        [
          "Context Clues",
          "Infer unfamiliar words from nearby details",
          select("ex-2-1", "If a trail is arduous, it is…", "difficult", [
            "well marked",
            "very short",
          ]),
          select("ex-2-2", "A jubilant crowd is feeling…", "joyful", ["sleepy", "confused"]),
        ],
        [
          "Nuance",
          "Tell apart words with close but different meanings",
          select("ex-2-3", "Which word means 'careful with money'?", "frugal", [
            "fragile",
            "furious",
          ]),
          select("ex-2-4", "Which word best describes an uncertain prediction?", "tentative", [
            "certain",
            "ancient",
          ]),
        ],
        [
          "Choose Precisely",
          "Build a precise sentence from word choices",
          build("ex-2-5", "Build: 'The clue was hard to notice.'", "the clue was subtle", [
            "the",
            "clue",
            "was",
            "subtle",
            "loud",
            "easy",
          ]),
        ],
      ],
    },
    {
      title: "Grammar Foundations",
      description: "Make every sentence clear, complete, and correct",
      color: "#3B82F6",
      tiles: [
        [
          "Parts of Speech",
          "Identify the jobs words do in a sentence",
          select("ex-3-1", "In 'Birds migrate south,' migrate is a…", "verb", [
            "noun",
            "adjective",
          ]),
          select("ex-3-2", "In 'a bright star,' bright is an…", "adjective", ["verb", "pronoun"]),
        ],
        [
          "Sentence Parts",
          "Find subjects and predicates",
          select("ex-3-3", "What is the subject in 'The robot danced'?", "The robot", [
            "danced",
            "the",
          ]),
          select("ex-3-4", "Which is a complete sentence?", "The lantern glowed.", [
            "Because it was dark.",
            "Under the bridge.",
          ]),
        ],
        [
          "Build a Sentence",
          "Put sentence parts in a natural order",
          build("ex-3-5", "Build a complete sentence.", "the robot danced", [
            "the",
            "robot",
            "danced",
            "quickly",
            "and",
          ]),
        ],
      ],
    },
    {
      title: "Sentence Craft",
      description: "Connect ideas with punctuation and strong structure",
      color: "#8B5CF6",
      tiles: [
        [
          "Punctuation",
          "Use end marks and commas with confidence",
          select("ex-4-1", "Which sentence uses a comma correctly?", "After lunch, we walked.", [
            "After, lunch we walked.",
            "After lunch we, walked.",
          ]),
          select("ex-4-2", "Which mark ends a question?", "question mark", ["period", "comma"]),
        ],
        [
          "Joining Ideas",
          "Combine related thoughts without run-ons",
          select(
            "ex-4-3",
            "Choose the best join: 'It rained. We stayed in.'",
            "It rained, so we stayed in.",
            ["It rained we stayed in.", "It rained, stayed in."],
          ),
          select("ex-4-4", "A run-on sentence has…", "two complete thoughts joined incorrectly", [
            "one short word",
            "a missing adjective",
          ]),
        ],
        [
          "Revise",
          "Build a polished compound sentence",
          build("ex-4-5", "Build: 'I read, and my brother drew.'", "i read and my brother drew", [
            "i",
            "read",
            "and",
            "my",
            "brother",
            "drew",
            "but",
          ]),
        ],
      ],
    },
    {
      title: "Reading Detectives",
      description: "Find main ideas, evidence, and an author's purpose",
      color: "#F59E0B",
      tiles: [
        [
          "Main Idea",
          "Separate a central message from small details",
          select("ex-5-1", "A main idea is…", "the most important point", [
            "a random fact",
            "the title only",
          ]),
          select("ex-5-2", "Which detail supports a garden article?", "Tomatoes need sunlight.", [
            "Gardens are always green.",
            "Books have pages.",
          ]),
        ],
        [
          "Evidence",
          "Use the text to support an answer",
          select("ex-5-3", "Text evidence is…", "a detail from what you read", [
            "a guess with no support",
            "a new topic",
          ]),
          select("ex-5-4", "Which is the strongest evidence?", "a direct fact from the passage", [
            "a friend's opinion",
            "a made-up example",
          ]),
        ],
        [
          "Purpose",
          "Build a claim about why an author wrote",
          build("ex-5-5", "Build: 'The author wrote to inform.'", "the author wrote to inform", [
            "the",
            "author",
            "wrote",
            "to",
            "inform",
            "dance",
          ]),
        ],
      ],
    },
    {
      title: "Research Ready",
      description: "Ask focused questions and use trustworthy sources",
      color: "#EC4899",
      tiles: [
        [
          "Good Questions",
          "Turn broad interests into researchable questions",
          select("ex-6-1", "Which question is focused?", "How do bees communicate?", [
            "Tell me everything about bees.",
            "Are bees nice?",
          ]),
          select("ex-6-2", "A research question should be…", "specific and answerable", [
            "impossible to check",
            "only yes or no",
          ]),
        ],
        [
          "Reliable Sources",
          "Recognize sources worth trusting",
          select(
            "ex-6-3",
            "Which source is most reliable for health facts?",
            "a public health agency",
            ["an anonymous post", "an advertisement"],
          ),
          select("ex-6-4", "A source's author and date help you judge…", "credibility", [
            "font size",
            "page color",
          ]),
        ],
        [
          "Cite It",
          "Build a simple evidence attribution",
          build(
            "ex-6-5",
            "Build: 'According to the museum, the fossil is old.'",
            "according to the museum the fossil is old",
            ["according", "to", "the", "museum", "fossil", "is", "old", "maybe"],
          ),
        ],
      ],
    },
    {
      title: "Media Smart",
      description: "Question claims, images, and persuasive techniques",
      color: "#EF4444",
      tiles: [
        [
          "Claims & Evidence",
          "Spot the difference between a claim and proof",
          select("ex-7-1", "'This is the best phone' is a…", "claim", ["proven fact", "citation"]),
          select("ex-7-2", "Evidence for a claim should be…", "verifiable", [
            "unrelated",
            "secret",
          ]),
        ],
        [
          "Persuasion",
          "Notice techniques designed to influence you",
          select("ex-7-3", "A celebrity endorsement tries to use…", "authority", [
            "weather",
            "spelling",
          ]),
          select("ex-7-4", "An ad that makes you fear missing out uses…", "emotion", [
            "a definition",
            "a timeline",
          ]),
        ],
        [
          "Check Before Sharing",
          "Build a responsible sharing habit",
          build(
            "ex-7-5",
            "Build: 'I will check the source first.'",
            "i will check the source first",
            ["i", "will", "check", "the", "source", "first", "share"],
          ),
        ],
      ],
    },
    {
      title: "Logic Lab",
      description: "Use patterns and reasons to make sound conclusions",
      color: "#06B6D4",
      tiles: [
        [
          "Patterns",
          "Recognize rules that connect information",
          select("ex-8-1", "What comes next: 2, 4, 6, …?", "8", ["7", "10"]),
          select("ex-8-2", "A pattern rule explains…", "how a sequence changes", [
            "who wrote it",
            "its color",
          ]),
        ],
        [
          "Reasoning",
          "Connect a reason to a conclusion",
          select("ex-8-3", "'It is cloudy, so it might rain' is a…", "reasonable inference", [
            "guarantee",
            "definition",
          ]),
          select("ex-8-4", "A conclusion should follow from…", "the available evidence", [
            "a random idea",
            "a louder voice",
          ]),
        ],
        [
          "Explain Why",
          "Build a conclusion with its reason",
          build(
            "ex-8-5",
            "Build: 'The path is wet because it rained.'",
            "the path is wet because it rained",
            ["the", "path", "is", "wet", "because", "it", "rained", "sunny"],
          ),
        ],
      ],
    },
    {
      title: "Writing Workshop",
      description: "Plan, draft, and revise writing that readers understand",
      color: "#6366F1",
      tiles: [
        [
          "Strong Starts",
          "Open with a topic sentence that guides readers",
          select("ex-9-1", "A topic sentence tells readers…", "the paragraph's main point", [
            "every tiny detail",
            "the page number",
          ]),
          select(
            "ex-9-2",
            "Which is a strong topic sentence?",
            "Recycling keeps useful materials out of landfills.",
            ["I like things.", "Many words are words."],
          ),
        ],
        [
          "Add Detail",
          "Support a point with useful specifics",
          select("ex-9-3", "A supporting detail should…", "explain the main point", [
            "change the subject",
            "repeat the title",
          ]),
          select("ex-9-4", "Which detail supports a bike paragraph?", "Bikes produce no exhaust.", [
            "Bikes have letters.",
            "Tuesday is a day.",
          ]),
        ],
        [
          "Revise for Clarity",
          "Build a clear revision",
          build("ex-9-5", "Build: 'Recycling saves resources.'", "recycling saves resources", [
            "recycling",
            "saves",
            "resources",
            "quickly",
            "green",
          ]),
        ],
      ],
    },
    {
      title: "Money Basics",
      description: "Practice everyday choices with saving and spending",
      color: "#22C55E",
      tiles: [
        [
          "Needs & Wants",
          "Tell essential costs from optional purchases",
          select("ex-10-1", "Which is usually a need?", "rent", ["a new game", "a fancy snack"]),
          select("ex-10-2", "A want is something that is…", "nice but not essential", [
            "required for safety",
            "always free",
          ]),
        ],
        [
          "Save & Spend",
          "Make choices that match a goal",
          select("ex-10-3", "Saving means…", "setting money aside for later", [
            "spending everything now",
            "borrowing without a plan",
          ]),
          select("ex-10-4", "A budget helps you…", "plan where money goes", [
            "predict the weather",
            "skip all decisions",
          ]),
        ],
        [
          "Set a Goal",
          "Build a simple savings goal",
          build("ex-10-5", "Build: 'I will save for a bike.'", "i will save for a bike", [
            "i",
            "will",
            "save",
            "for",
            "a",
            "bike",
            "spend",
          ]),
        ],
      ],
    },
    {
      title: "Digital Citizenship",
      description: "Make safe, kind, and thoughtful choices online",
      color: "#F97316",
      tiles: [
        [
          "Protect Privacy",
          "Know what information should stay private",
          select("ex-11-1", "Which detail should stay private?", "your password", [
            "your favorite color",
            "a public book title",
          ]),
          select("ex-11-2", "A strong password should be…", "unique and hard to guess", [
            "your first name",
            "shared with friends",
          ]),
        ],
        [
          "Be Kind Online",
          "Communicate with empathy and respect",
          select("ex-11-3", "Before posting, you should consider…", "how it may affect others", [
            "how many caps it has",
            "whether it rhymes",
          ]),
          select(
            "ex-11-4",
            "If someone is unkind online, a good step is…",
            "tell a trusted adult",
            ["reply with insults", "share their private info"],
          ),
        ],
        [
          "Pause & Check",
          "Build a safe response before clicking",
          build("ex-11-5", "Build: 'I will ask before I share.'", "i will ask before i share", [
            "i",
            "will",
            "ask",
            "before",
            "share",
            "click",
          ]),
        ],
      ],
    },
  ] as const;

  const tileTypes: Tile["type"][] = ["star", "book", "dumbbell"];
  return units.map((unit, unitIndex) => ({
    id: `unit-${unitIndex + 2}`,
    order: unitIndex + 2,
    title: unit.title,
    description: unit.description,
    color: unit.color,
    tiles: unit.tiles.map(([title, description, ...exercises], tileIndex) => ({
      id: `tile-${unitIndex + 2}-${tileIndex + 1}`,
      type: tileTypes[tileIndex],
      title,
      description,
      exercises,
    })),
  }));
}

function flatTiles(units: Unit[]): Tile[] {
  return units.flatMap((u) => u.tiles);
}

export function getUnitById(id: string): Unit | undefined {
  return UNITS.find((u) => u.id === id);
}

export function getTileById(id: string): Tile | undefined {
  return flatTiles(UNITS).find((t) => t.id === id);
}

export function getTileStatus(
  tileId: string,
  completedTiles: string[],
  allUnits: Unit[] = UNITS,
): "LOCKED" | "ACTIVE" | "COMPLETE" {
  if (completedTiles.includes(tileId)) return "COMPLETE";
  const all = flatTiles(allUnits);
  const idx = all.findIndex((t) => t.id === tileId);
  if (idx === 0) return "ACTIVE";
  if (idx > 0 && completedTiles.includes(all[idx - 1].id)) return "ACTIVE";
  return "LOCKED";
}
