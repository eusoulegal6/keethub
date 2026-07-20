export type TileStatus = "LOCKED" | "ACTIVE" | "COMPLETE";

export type LessonPhase = "intro" | "exercise" | "feedback" | "complete" | "fail";

export type ExerciseType = "SELECT_1_OF_3" | "WRITE_IN_ENGLISH";

export type TileType = "star" | "book" | "dumbbell" | "trophy" | "treasure" | "fast-forward";

export interface ChoiceOption {
  id: string;
  text: string;
  icon?: string;
}

export interface Exercise {
  id: string;
  type: ExerciseType;
  question: string;
  correctAnswer: string;
  choices?: ChoiceOption[];
  wordBank?: string[];
}

export interface Tile {
  id: string;
  type: TileType;
  title: string;
  description: string;
  exercises: Exercise[];
}

export interface Unit {
  id: string;
  order: number;
  title: string;
  description: string;
  color: string;
  tiles: Tile[];
}

export interface ExerciseAttempt {
  exerciseId: string;
  userAnswer: string;
  isCorrect: boolean;
}

export interface AcademyProgress {
  completedTiles: string[];
  totalLessonsCompleted: number;
  xpByDate: Record<string, number>;
}
