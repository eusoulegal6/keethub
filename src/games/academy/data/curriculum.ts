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
];

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
