import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LessonPhase, ExerciseAttempt } from "./types";
import { UNITS, getTileById, getUnitById } from "./data/curriculum";

const HEARTS = 3;
const FEEDBACK_DELAY_MS = 1800;

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

interface AcademyState {
  phase: LessonPhase;
  activeUnitId: string | null;
  activeTileId: string | null;
  hearts: number;
  currentExerciseIndex: number;
  correctCount: number;
  attempts: ExerciseAttempt[];
  isTransitioning: boolean;

  // persisted
  completedTiles: string[];
  totalLessonsCompleted: number;
  xpByDate: Record<string, number>;

  // actions
  startLesson: (unitId: string, tileId: string) => void;
  advanceToExercise: () => void;
  submitAnswer: (answer: string) => void;
  advanceFromFeedback: () => void;
  retryLesson: () => void;
  returnToPath: () => void;
}

export const useAcademyStore = create<AcademyState>()(
  persist(
    (set, get) => ({
      phase: "intro",
      activeUnitId: null,
      activeTileId: null,
      hearts: HEARTS,
      currentExerciseIndex: 0,
      correctCount: 0,
      attempts: [],
      isTransitioning: false,

      completedTiles: [],
      totalLessonsCompleted: 0,
      xpByDate: {},

      startLesson: (unitId, tileId) => {
        clearScheduledTimers();
        const tile = getTileById(tileId);
        const unit = getUnitById(unitId);
        if (!tile || !unit) return;
        set({
          phase: "intro",
          activeUnitId: unitId,
          activeTileId: tileId,
          hearts: HEARTS,
          currentExerciseIndex: 0,
          correctCount: 0,
          attempts: [],
          isTransitioning: false,
        });
      },

      advanceToExercise: () => {
        const { activeTileId } = get();
        const tile = activeTileId ? getTileById(activeTileId) : null;
        if (!tile || tile.exercises.length === 0) return;
        set({ phase: "exercise", isTransitioning: false });
      },

      submitAnswer: (answer) => {
        const state = get();
        if (state.phase !== "exercise" || state.isTransitioning) return;
        const tile = state.activeTileId ? getTileById(state.activeTileId) : null;
        if (!tile) return;
        const exercise = tile.exercises[state.currentExerciseIndex];
        if (!exercise) return;

        const isCorrect =
          answer.trim().toLowerCase() === exercise.correctAnswer.trim().toLowerCase();
        const newHearts = isCorrect ? state.hearts : state.hearts - 1;
        const newCorrect = isCorrect ? state.correctCount + 1 : state.correctCount;

        const attempt: ExerciseAttempt = {
          exerciseId: exercise.id,
          userAnswer: answer,
          isCorrect,
        };

        set({
          attempts: [...state.attempts, attempt],
          correctCount: newCorrect,
          hearts: newHearts,
          isTransitioning: true,
        });

        schedule(() => {
          const s = get();
          if (s.phase !== "exercise") return;
          set({ phase: "feedback" });
        }, 400);
      },

      advanceFromFeedback: () => {
        const state = get();
        if (state.phase !== "feedback") return;
        const tile = state.activeTileId ? getTileById(state.activeTileId) : null;
        if (!tile) return;

        const nextIndex = state.currentExerciseIndex + 1;
        const isLastExercise = nextIndex >= tile.exercises.length;
        const isDead = state.hearts <= 0;

        if (isDead) {
          set({ phase: "fail", isTransitioning: false });
          return;
        }

        if (isLastExercise) {
          const today = new Date().toISOString().slice(0, 10);
          const xpGain = state.correctCount;
          set((s) => ({
            phase: "complete",
            isTransitioning: false,
            completedTiles: s.completedTiles.includes(tile.id)
              ? s.completedTiles
              : [...s.completedTiles, tile.id],
            totalLessonsCompleted: s.totalLessonsCompleted + 1,
            xpByDate: {
              ...s.xpByDate,
              [today]: (s.xpByDate[today] ?? 0) + xpGain,
            },
          }));
        } else {
          set({
            phase: "exercise",
            currentExerciseIndex: nextIndex,
            isTransitioning: false,
          });
        }
      },

      retryLesson: () => {
        const { activeUnitId, activeTileId } = get();
        if (!activeUnitId || !activeTileId) return;
        get().startLesson(activeUnitId, activeTileId);
      },

      returnToPath: () => {
        clearScheduledTimers();
        set({
          phase: "intro",
          activeUnitId: null,
          activeTileId: null,
          hearts: HEARTS,
          currentExerciseIndex: 0,
          correctCount: 0,
          attempts: [],
          isTransitioning: false,
        });
      },
    }),
    {
      name: "keethub-academy-progress",
      partialize: (state) => ({
        completedTiles: state.completedTiles,
        totalLessonsCompleted: state.totalLessonsCompleted,
        xpByDate: state.xpByDate,
      }),
    },
  ),
);
