export type GamePhase =
  | "setup"
  | "question-intro"
  | "question"
  | "answer-reveal"
  | "scoring"
  | "podium";

export interface QuestionOption {
  id: string;
  text: string;
  color: string;
}

export interface Question {
  id: string;
  text: string;
  options: QuestionOption[];
  correctOptionId: string;
  timeLimit: number;
}

export interface QuizCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  questionCount: number;
}

export interface AnswerRecord {
  questionId: string;
  selectedOptionId: string | null;
  isCorrect: boolean;
  timeMs: number;
  points: number;
}
