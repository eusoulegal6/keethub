import { create } from "zustand";
import type { GamePhase, Question, AnswerRecord } from "./types";
import { getQuestionsByQuizId, getAllQuizzes } from "./data/questions";
import type { QuizCategory } from "./types";

const QUESTIONS_PER_GAME = 7;
const INTRO_DELAY_MS = 2500;
const REVEAL_DELAY_MS = 3000;
const SCORING_DELAY_MS = 2000;
const BASE_POINTS = 1000;

const scheduledTimers = new Set<ReturnType<typeof setTimeout>>();

function schedule(callback: () => void, delay: number): void {
  const timer = setTimeout(() => {
    scheduledTimers.delete(timer);
    callback();
  }, delay);
  scheduledTimers.add(timer);
}

function clearScheduledTimers(): void {
  scheduledTimers.forEach((timer) => clearTimeout(timer));
  scheduledTimers.clear();
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom<T>(arr: T[], count: number): T[] {
  return shuffle(arr).slice(0, count);
}

function calcPoints(timeLeft: number, timeLimit: number, streak: number): number {
  const speedMultiplier = 0.5 + 1.5 * (timeLeft / timeLimit);
  const streakBonus = Math.min(streak * 50, 500);
  return Math.round(BASE_POINTS * speedMultiplier + streakBonus);
}

interface TriviaState {
  phase: GamePhase;
  categoryId: string | null;
  questions: Question[];
  currentIndex: number;
  score: number;
  streak: number;
  timeLeft: number;
  selectedOptionId: string | null;
  lastResult: { isCorrect: boolean; points: number } | null;
  answers: AnswerRecord[];
  questionStartTime: number;
  availableQuizzes: QuizCategory[];

  // actions
  startGame: (quizId: string) => void;
  selectAnswer: (optionId: string) => void;
  timeUp: () => void;
  advanceFromIntro: () => void;
  advanceFromReveal: () => void;
  advanceFromScoring: () => void;
  tick: () => void;
  reset: () => void;
}

export const useTriviaStore = create<TriviaState>((set, get) => ({
  phase: "setup",
  categoryId: null,
  questions: [],
  currentIndex: 0,
  score: 0,
  streak: 0,
  timeLeft: 0,
  selectedOptionId: null,
  lastResult: null,
  answers: [],
  questionStartTime: 0,
  availableQuizzes: getAllQuizzes(),

  startGame: (quizId: string) => {
    clearScheduledTimers();
    const allQuestions = getQuestionsByQuizId(quizId);
    const questions = pickRandom(allQuestions, QUESTIONS_PER_GAME);
    set({
      phase: "question-intro",
      categoryId: quizId,
      questions,
      currentIndex: 0,
      score: 0,
      streak: 0,
      selectedOptionId: null,
      lastResult: null,
      answers: [],
    });
    schedule(() => get().advanceFromIntro(), INTRO_DELAY_MS);
  },

  advanceFromIntro: () => {
    const { questions, currentIndex } = get();
    const question = questions[currentIndex];
    if (!question) {
      set({ phase: "podium" });
      return;
    }
    set({
      phase: "question",
      timeLeft: question.timeLimit,
      selectedOptionId: null,
      lastResult: null,
      questionStartTime: Date.now(),
    });
  },

  tick: () => {
    const { phase, timeLeft, lastResult } = get();
    if (phase !== "question" || lastResult !== null) return;
    if (timeLeft <= 1) {
      get().timeUp();
    } else {
      set({ timeLeft: timeLeft - 1 });
    }
  },

  selectAnswer: (optionId: string) => {
    const state = get();
    if (state.phase !== "question" || state.selectedOptionId !== null || state.lastResult !== null)
      return;
    const question = state.questions[state.currentIndex];
    const isCorrect = optionId === question.correctOptionId;
    const elapsedMs = Date.now() - state.questionStartTime;
    const newStreak = isCorrect ? state.streak + 1 : 0;
    const points = isCorrect ? calcPoints(state.timeLeft, question.timeLimit, newStreak) : 0;
    const answer: AnswerRecord = {
      questionId: question.id,
      selectedOptionId: optionId,
      isCorrect,
      timeMs: elapsedMs,
      points,
    };
    set({
      selectedOptionId: optionId,
      lastResult: { isCorrect, points },
      score: state.score + points,
      streak: newStreak,
      answers: [...state.answers, answer],
    });
    schedule(() => {
      const s = get();
      if (s.phase !== "question") return;
      set({ phase: "answer-reveal" });
      schedule(() => get().advanceFromReveal(), REVEAL_DELAY_MS);
    }, 800);
  },

  timeUp: () => {
    const state = get();
    if (state.phase !== "question" || state.lastResult !== null) return;
    const question = state.questions[state.currentIndex];
    const answer: AnswerRecord = {
      questionId: question.id,
      selectedOptionId: null,
      isCorrect: false,
      timeMs: question.timeLimit * 1000,
      points: 0,
    };
    set({
      selectedOptionId: null,
      lastResult: { isCorrect: false, points: 0 },
      streak: 0,
      answers: [...state.answers, answer],
    });
    schedule(() => {
      const s = get();
      if (s.phase !== "question") return;
      set({ phase: "answer-reveal" });
      schedule(() => get().advanceFromReveal(), REVEAL_DELAY_MS);
    }, 800);
  },

  advanceFromReveal: () => {
    set({ phase: "scoring" });
    schedule(() => get().advanceFromScoring(), SCORING_DELAY_MS);
  },

  advanceFromScoring: () => {
    const { currentIndex, questions } = get();
    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      set({ phase: "podium" });
    } else {
      set({
        phase: "question-intro",
        currentIndex: nextIndex,
        selectedOptionId: null,
        lastResult: null,
      });
      schedule(() => get().advanceFromIntro(), INTRO_DELAY_MS);
    }
  },

  reset: () => {
    clearScheduledTimers();
    set({
      phase: "setup",
      categoryId: null,
      questions: [],
      currentIndex: 0,
      score: 0,
      streak: 0,
      timeLeft: 0,
      selectedOptionId: null,
      lastResult: null,
      answers: [],
      questionStartTime: 0,
    });
  },
}));
