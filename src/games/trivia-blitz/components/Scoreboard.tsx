import { useTriviaStore } from "../store";
import ScoreboardDisplay from "./ScoreboardDisplay";

export default function Scoreboard() {
  const questions = useTriviaStore((s) => s.questions);
  const currentIndex = useTriviaStore((s) => s.currentIndex);
  const score = useTriviaStore((s) => s.score);

  return (
    <ScoreboardDisplay
      players={[{ id: "solo-player", name: "You", score }]}
      questionNumber={currentIndex + 1}
      totalQuestions={questions.length}
    />
  );
}
