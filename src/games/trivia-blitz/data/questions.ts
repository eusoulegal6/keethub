import type { Question, QuizCategory } from "../types";

export const GENERAL_QUESTIONS: Question[] = [
  {
    id: "gen1", text: "What is the capital of France?",
    options: [
      { id: "a", text: "London", color: "#ef4444" },
      { id: "b", text: "Berlin", color: "#3b82f6" },
      { id: "c", text: "Paris", color: "#eab308" },
      { id: "d", text: "Madrid", color: "#22c55e" },
    ],
    correctOptionId: "c", timeLimit: 20,
  },
  {
    id: "gen2", text: "Which planet is known as the Red Planet?",
    options: [
      { id: "a", text: "Venus", color: "#ef4444" },
      { id: "b", text: "Mars", color: "#3b82f6" },
      { id: "c", text: "Jupiter", color: "#eab308" },
      { id: "d", text: "Saturn", color: "#22c55e" },
    ],
    correctOptionId: "b", timeLimit: 20,
  },
  {
    id: "gen3", text: "What is 2 + 2?",
    options: [
      { id: "a", text: "3", color: "#ef4444" },
      { id: "b", text: "4", color: "#3b82f6" },
      { id: "c", text: "5", color: "#eab308" },
      { id: "d", text: "6", color: "#22c55e" },
    ],
    correctOptionId: "b", timeLimit: 15,
  },
  {
    id: "gen4", text: "Who painted the Mona Lisa?",
    options: [
      { id: "a", text: "Van Gogh", color: "#ef4444" },
      { id: "b", text: "Picasso", color: "#3b82f6" },
      { id: "c", text: "Leonardo da Vinci", color: "#eab308" },
      { id: "d", text: "Michelangelo", color: "#22c55e" },
    ],
    correctOptionId: "c", timeLimit: 20,
  },
  {
    id: "gen5", text: "What is the largest ocean on Earth?",
    options: [
      { id: "a", text: "Atlantic", color: "#ef4444" },
      { id: "b", text: "Indian", color: "#3b82f6" },
      { id: "c", text: "Arctic", color: "#eab308" },
      { id: "d", text: "Pacific", color: "#22c55e" },
    ],
    correctOptionId: "d", timeLimit: 20,
  },
];

export const SCIENCE_QUESTIONS: Question[] = [
  {
    id: "sci1", text: "What is the chemical symbol for water?",
    options: [
      { id: "a", text: "H₂O", color: "#ef4444" },
      { id: "b", text: "CO₂", color: "#3b82f6" },
      { id: "c", text: "O₂", color: "#eab308" },
      { id: "d", text: "NaCl", color: "#22c55e" },
    ],
    correctOptionId: "a", timeLimit: 20,
  },
  {
    id: "sci2", text: "What is the speed of light in vacuum (approximately)?",
    options: [
      { id: "a", text: "300,000 km/s", color: "#ef4444" },
      { id: "b", text: "150,000 km/s", color: "#3b82f6" },
      { id: "c", text: "450,000 km/s", color: "#eab308" },
      { id: "d", text: "200,000 km/s", color: "#22c55e" },
    ],
    correctOptionId: "a", timeLimit: 25,
  },
  {
    id: "sci3", text: "What is the smallest unit of matter?",
    options: [
      { id: "a", text: "Molecule", color: "#ef4444" },
      { id: "b", text: "Atom", color: "#3b82f6" },
      { id: "c", text: "Electron", color: "#eab308" },
      { id: "d", text: "Proton", color: "#22c55e" },
    ],
    correctOptionId: "b", timeLimit: 20,
  },
  {
    id: "sci4", text: "How many bones does an adult human have?",
    options: [
      { id: "a", text: "196", color: "#ef4444" },
      { id: "b", text: "206", color: "#3b82f6" },
      { id: "c", text: "216", color: "#eab308" },
      { id: "d", text: "226", color: "#22c55e" },
    ],
    correctOptionId: "b", timeLimit: 20,
  },
  {
    id: "sci5", text: "What planet is closest to the Sun?",
    options: [
      { id: "a", text: "Venus", color: "#ef4444" },
      { id: "b", text: "Earth", color: "#3b82f6" },
      { id: "c", text: "Mercury", color: "#eab308" },
      { id: "d", text: "Mars", color: "#22c55e" },
    ],
    correctOptionId: "c", timeLimit: 20,
  },
  {
    id: "sci6", text: "What is the hardest natural substance on Earth?",
    options: [
      { id: "a", text: "Gold", color: "#ef4444" },
      { id: "b", text: "Iron", color: "#3b82f6" },
      { id: "c", text: "Diamond", color: "#eab308" },
      { id: "d", text: "Platinum", color: "#22c55e" },
    ],
    correctOptionId: "c", timeLimit: 20,
  },
  {
    id: "sci7", text: "What gas do plants absorb from the atmosphere?",
    options: [
      { id: "a", text: "Oxygen", color: "#ef4444" },
      { id: "b", text: "Nitrogen", color: "#3b82f6" },
      { id: "c", text: "Carbon Dioxide", color: "#eab308" },
      { id: "d", text: "Hydrogen", color: "#22c55e" },
    ],
    correctOptionId: "c", timeLimit: 20,
  },
];

export const HISTORY_QUESTIONS: Question[] = [
  {
    id: "his1", text: "In which year did World War II end?",
    options: [
      { id: "a", text: "1943", color: "#ef4444" },
      { id: "b", text: "1945", color: "#3b82f6" },
      { id: "c", text: "1947", color: "#eab308" },
      { id: "d", text: "1949", color: "#22c55e" },
    ],
    correctOptionId: "b", timeLimit: 20,
  },
  {
    id: "his2", text: "Who was the first person to walk on the Moon?",
    options: [
      { id: "a", text: "Buzz Aldrin", color: "#ef4444" },
      { id: "b", text: "Neil Armstrong", color: "#3b82f6" },
      { id: "c", text: "Michael Collins", color: "#eab308" },
      { id: "d", text: "Yuri Gagarin", color: "#22c55e" },
    ],
    correctOptionId: "b", timeLimit: 20,
  },
  {
    id: "his3", text: "In which year did the Berlin Wall fall?",
    options: [
      { id: "a", text: "1987", color: "#ef4444" },
      { id: "b", text: "1989", color: "#3b82f6" },
      { id: "c", text: "1991", color: "#eab308" },
      { id: "d", text: "1993", color: "#22c55e" },
    ],
    correctOptionId: "b", timeLimit: 20,
  },
  {
    id: "his4", text: "Which ancient civilization built the Great Pyramid of Giza?",
    options: [
      { id: "a", text: "Greeks", color: "#ef4444" },
      { id: "b", text: "Romans", color: "#3b82f6" },
      { id: "c", text: "Egyptians", color: "#eab308" },
      { id: "d", text: "Babylonians", color: "#22c55e" },
    ],
    correctOptionId: "c", timeLimit: 20,
  },
  {
    id: "his5", text: "Who painted the ceiling of the Sistine Chapel?",
    options: [
      { id: "a", text: "Leonardo da Vinci", color: "#ef4444" },
      { id: "b", text: "Raphael", color: "#3b82f6" },
      { id: "c", text: "Michelangelo", color: "#eab308" },
      { id: "d", text: "Donatello", color: "#22c55e" },
    ],
    correctOptionId: "c", timeLimit: 20,
  },
  {
    id: "his6", text: "In which year did the Titanic sink?",
    options: [
      { id: "a", text: "1910", color: "#ef4444" },
      { id: "b", text: "1912", color: "#3b82f6" },
      { id: "c", text: "1914", color: "#eab308" },
      { id: "d", text: "1916", color: "#22c55e" },
    ],
    correctOptionId: "b", timeLimit: 20,
  },
];

export const POP_CULTURE_QUESTIONS: Question[] = [
  {
    id: "pop1", text: "Which movie won the Academy Award for Best Picture in 2020?",
    options: [
      { id: "a", text: "1917", color: "#ef4444" },
      { id: "b", text: "Parasite", color: "#3b82f6" },
      { id: "c", text: "Joker", color: "#eab308" },
      { id: "d", text: "Once Upon a Time in Hollywood", color: "#22c55e" },
    ],
    correctOptionId: "b", timeLimit: 25,
  },
  {
    id: "pop2", text: "What is the highest-grossing movie of all time?",
    options: [
      { id: "a", text: "Avatar", color: "#ef4444" },
      { id: "b", text: "Avengers: Endgame", color: "#3b82f6" },
      { id: "c", text: "Titanic", color: "#eab308" },
      { id: "d", text: "Star Wars: The Force Awakens", color: "#22c55e" },
    ],
    correctOptionId: "a", timeLimit: 20,
  },
  {
    id: "pop3", text: "Which artist has won the most Grammy Awards?",
    options: [
      { id: "a", text: "Beyoncé", color: "#ef4444" },
      { id: "b", text: "Georg Solti", color: "#3b82f6" },
      { id: "c", text: "Quincy Jones", color: "#eab308" },
      { id: "d", text: "Taylor Swift", color: "#22c55e" },
    ],
    correctOptionId: "b", timeLimit: 25,
  },
  {
    id: "pop4", text: "What is the name of the main character in 'The Matrix'?",
    options: [
      { id: "a", text: "Neo", color: "#ef4444" },
      { id: "b", text: "Morpheus", color: "#3b82f6" },
      { id: "c", text: "Trinity", color: "#eab308" },
      { id: "d", text: "Agent Smith", color: "#22c55e" },
    ],
    correctOptionId: "a", timeLimit: 20,
  },
  {
    id: "pop5", text: "Which streaming service originally produced 'Stranger Things'?",
    options: [
      { id: "a", text: "Hulu", color: "#ef4444" },
      { id: "b", text: "Netflix", color: "#3b82f6" },
      { id: "c", text: "Amazon Prime", color: "#eab308" },
      { id: "d", text: "Disney+", color: "#22c55e" },
    ],
    correctOptionId: "b", timeLimit: 20,
  },
  {
    id: "pop6", text: "What year did the first iPhone launch?",
    options: [
      { id: "a", text: "2005", color: "#ef4444" },
      { id: "b", text: "2007", color: "#3b82f6" },
      { id: "c", text: "2009", color: "#eab308" },
      { id: "d", text: "2011", color: "#22c55e" },
    ],
    correctOptionId: "b", timeLimit: 20,
  },
];

export const SPORTS_QUESTIONS: Question[] = [
  {
    id: "spt1", text: "How many players are on a soccer team on the field at one time?",
    options: [
      { id: "a", text: "9", color: "#ef4444" },
      { id: "b", text: "10", color: "#3b82f6" },
      { id: "c", text: "11", color: "#eab308" },
      { id: "d", text: "12", color: "#22c55e" },
    ],
    correctOptionId: "c", timeLimit: 20,
  },
  {
    id: "spt2", text: "Which country has won the most FIFA World Cups?",
    options: [
      { id: "a", text: "Germany", color: "#ef4444" },
      { id: "b", text: "Argentina", color: "#3b82f6" },
      { id: "c", text: "Brazil", color: "#eab308" },
      { id: "d", text: "Italy", color: "#22c55e" },
    ],
    correctOptionId: "c", timeLimit: 20,
  },
  {
    id: "spt3", text: "In basketball, how many points is a three-point shot worth?",
    options: [
      { id: "a", text: "2", color: "#ef4444" },
      { id: "b", text: "3", color: "#3b82f6" },
      { id: "c", text: "4", color: "#eab308" },
      { id: "d", text: "5", color: "#22c55e" },
    ],
    correctOptionId: "b", timeLimit: 15,
  },
  {
    id: "spt4", text: "Which sport is played at Wimbledon?",
    options: [
      { id: "a", text: "Golf", color: "#ef4444" },
      { id: "b", text: "Tennis", color: "#3b82f6" },
      { id: "c", text: "Cricket", color: "#eab308" },
      { id: "d", text: "Rugby", color: "#22c55e" },
    ],
    correctOptionId: "b", timeLimit: 20,
  },
  {
    id: "spt5", text: "How many Olympic rings are there?",
    options: [
      { id: "a", text: "4", color: "#ef4444" },
      { id: "b", text: "5", color: "#3b82f6" },
      { id: "c", text: "6", color: "#eab308" },
      { id: "d", text: "7", color: "#22c55e" },
    ],
    correctOptionId: "b", timeLimit: 20,
  },
  {
    id: "spt6", text: "What is the national sport of Canada?",
    options: [
      { id: "a", text: "Hockey", color: "#ef4444" },
      { id: "b", text: "Basketball", color: "#3b82f6" },
      { id: "c", text: "Baseball", color: "#eab308" },
      { id: "d", text: "Soccer", color: "#22c55e" },
    ],
    correctOptionId: "a", timeLimit: 20,
  },
];

export const GEOGRAPHY_QUESTIONS: Question[] = [
  {
    id: "geo1", text: "What is the smallest country in the world?",
    options: [
      { id: "a", text: "Monaco", color: "#ef4444" },
      { id: "b", text: "Vatican City", color: "#3b82f6" },
      { id: "c", text: "San Marino", color: "#eab308" },
      { id: "d", text: "Liechtenstein", color: "#22c55e" },
    ],
    correctOptionId: "b", timeLimit: 20,
  },
  {
    id: "geo2", text: "Which river is the longest in the world?",
    options: [
      { id: "a", text: "Amazon", color: "#ef4444" },
      { id: "b", text: "Nile", color: "#3b82f6" },
      { id: "c", text: "Yangtze", color: "#eab308" },
      { id: "d", text: "Mississippi", color: "#22c55e" },
    ],
    correctOptionId: "b", timeLimit: 20,
  },
  {
    id: "geo3", text: "What is the capital of Australia?",
    options: [
      { id: "a", text: "Sydney", color: "#ef4444" },
      { id: "b", text: "Melbourne", color: "#3b82f6" },
      { id: "c", text: "Canberra", color: "#eab308" },
      { id: "d", text: "Brisbane", color: "#22c55e" },
    ],
    correctOptionId: "c", timeLimit: 20,
  },
  {
    id: "geo4", text: "How many continents are there?",
    options: [
      { id: "a", text: "5", color: "#ef4444" },
      { id: "b", text: "6", color: "#3b82f6" },
      { id: "c", text: "7", color: "#eab308" },
      { id: "d", text: "8", color: "#22c55e" },
    ],
    correctOptionId: "c", timeLimit: 20,
  },
  {
    id: "geo5", text: "What is the highest mountain in the world?",
    options: [
      { id: "a", text: "K2", color: "#ef4444" },
      { id: "b", text: "Mount Everest", color: "#3b82f6" },
      { id: "c", text: "Kilimanjaro", color: "#eab308" },
      { id: "d", text: "Mount Fuji", color: "#22c55e" },
    ],
    correctOptionId: "b", timeLimit: 20,
  },
  {
    id: "geo6", text: "Which country is known as the Land of the Rising Sun?",
    options: [
      { id: "a", text: "China", color: "#ef4444" },
      { id: "b", text: "Korea", color: "#3b82f6" },
      { id: "c", text: "Japan", color: "#eab308" },
      { id: "d", text: "Thailand", color: "#22c55e" },
    ],
    correctOptionId: "c", timeLimit: 20,
  },
  {
    id: "geo7", text: "What is the largest desert in the world?",
    options: [
      { id: "a", text: "Gobi Desert", color: "#ef4444" },
      { id: "b", text: "Sahara Desert", color: "#3b82f6" },
      { id: "c", text: "Arabian Desert", color: "#eab308" },
      { id: "d", text: "Antarctic Desert", color: "#22c55e" },
    ],
    correctOptionId: "d", timeLimit: 25,
  },
];

export const TECHNOLOGY_QUESTIONS: Question[] = [
  {
    id: "tech1", text: "What does 'CPU' stand for?",
    options: [
      { id: "a", text: "Central Processing Unit", color: "#ef4444" },
      { id: "b", text: "Computer Personal Unit", color: "#3b82f6" },
      { id: "c", text: "Central Program Utility", color: "#eab308" },
      { id: "d", text: "Computer Processing Utility", color: "#22c55e" },
    ],
    correctOptionId: "a", timeLimit: 20,
  },
  {
    id: "tech2", text: "Which programming language was created by Guido van Rossum?",
    options: [
      { id: "a", text: "Java", color: "#ef4444" },
      { id: "b", text: "JavaScript", color: "#3b82f6" },
      { id: "c", text: "Python", color: "#eab308" },
      { id: "d", text: "C++", color: "#22c55e" },
    ],
    correctOptionId: "c", timeLimit: 20,
  },
  {
    id: "tech3", text: "What does 'HTML' stand for?",
    options: [
      { id: "a", text: "HyperText Markup Language", color: "#ef4444" },
      { id: "b", text: "High Tech Modern Language", color: "#3b82f6" },
      { id: "c", text: "Home Tool Markup Language", color: "#eab308" },
      { id: "d", text: "HyperText Modern Language", color: "#22c55e" },
    ],
    correctOptionId: "a", timeLimit: 20,
  },
  {
    id: "tech4", text: "What was the first widely used web browser?",
    options: [
      { id: "a", text: "Internet Explorer", color: "#ef4444" },
      { id: "b", text: "Netscape Navigator", color: "#3b82f6" },
      { id: "c", text: "Mosaic", color: "#eab308" },
      { id: "d", text: "Safari", color: "#22c55e" },
    ],
    correctOptionId: "c", timeLimit: 25,
  },
  {
    id: "tech5", text: "What does 'AI' stand for in technology?",
    options: [
      { id: "a", text: "Advanced Internet", color: "#ef4444" },
      { id: "b", text: "Artificial Intelligence", color: "#3b82f6" },
      { id: "c", text: "Automated Interface", color: "#eab308" },
      { id: "d", text: "Application Integration", color: "#22c55e" },
    ],
    correctOptionId: "b", timeLimit: 20,
  },
  {
    id: "tech6", text: "Which company created the Android operating system?",
    options: [
      { id: "a", text: "Apple", color: "#ef4444" },
      { id: "b", text: "Microsoft", color: "#3b82f6" },
      { id: "c", text: "Google", color: "#eab308" },
      { id: "d", text: "Samsung", color: "#22c55e" },
    ],
    correctOptionId: "c", timeLimit: 20,
  },
];

export const QUIZZES: Record<string, { id: string; name: string; description: string; icon: string; questions: Question[] }> = {
  general: { id: "general", name: "General Knowledge", description: "Mix of science, history, geography, and more", icon: "\u{1F9E0}", questions: GENERAL_QUESTIONS },
  science: { id: "science", name: "Science", description: "Biology, chemistry, physics, and astronomy", icon: "\u{1F52C}", questions: SCIENCE_QUESTIONS },
  history: { id: "history", name: "History", description: "World history, events, and historical figures", icon: "\u{1F4DC}", questions: HISTORY_QUESTIONS },
  "pop-culture": { id: "pop-culture", name: "Pop Culture", description: "Movies, music, TV shows, and entertainment", icon: "\u{1F3AC}", questions: POP_CULTURE_QUESTIONS },
  sports: { id: "sports", name: "Sports", description: "Athletics, teams, and sporting events", icon: "⚽", questions: SPORTS_QUESTIONS },
  geography: { id: "geography", name: "Geography", description: "Countries, capitals, and world geography", icon: "\u{1F30D}", questions: GEOGRAPHY_QUESTIONS },
  technology: { id: "technology", name: "Technology", description: "Computers, programming, and tech history", icon: "\u{1F4BB}", questions: TECHNOLOGY_QUESTIONS },
};

export function getAllQuizzes(): QuizCategory[] {
  return Object.values(QUIZZES).map((q) => ({
    id: q.id,
    name: q.name,
    description: q.description,
    icon: q.icon,
    questionCount: q.questions.length,
  }));
}

export function getQuestionsByQuizId(quizId: string): Question[] {
  return QUIZZES[quizId]?.questions ?? GENERAL_QUESTIONS;
}
