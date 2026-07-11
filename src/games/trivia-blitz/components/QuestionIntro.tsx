import { useTriviaStore } from "../store";

export default function QuestionIntro() {
  const currentIndex = useTriviaStore((s) => s.currentIndex);
  const questions = useTriviaStore((s) => s.questions);

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="text-center">
        <p className="text-6xl mb-4">{currentIndex === 0 ? "\u{1F3AC}" : "⚡"}</p>
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
          {currentIndex === 0 ? "Get Ready!" : "Next Question!"}
        </h2>
        <p className="text-lg text-muted-foreground">
          Question {currentIndex + 1} of {questions.length}
        </p>
        <div className="mt-6 flex justify-center gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
