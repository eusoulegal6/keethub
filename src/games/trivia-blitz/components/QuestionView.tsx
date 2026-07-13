import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useTriviaStore } from "../store";
import { cn } from "@/lib/utils";

export default function QuestionView() {
  const questions = useTriviaStore((s) => s.questions);
  const currentIndex = useTriviaStore((s) => s.currentIndex);
  const timeLeft = useTriviaStore((s) => s.timeLeft);
  const selectedOptionId = useTriviaStore((s) => s.selectedOptionId);
  const lastResult = useTriviaStore((s) => s.lastResult);
  const score = useTriviaStore((s) => s.score);
  const streak = useTriviaStore((s) => s.streak);
  const selectAnswer = useTriviaStore((s) => s.selectAnswer);
  const tick = useTriviaStore((s) => s.tick);

  const question = questions[currentIndex];
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasAnswered = selectedOptionId !== null || lastResult !== null;

  useEffect(() => {
    intervalRef.current = setInterval(() => tick(), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tick, currentIndex]);

  if (!question) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Loading question...</p>
        </Card>
      </div>
    );
  }

  const progress = (timeLeft / question.timeLimit) * 100;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 md:py-8">
      {/* Top bar: question count, timer, score */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-foreground font-medium">
          Question {currentIndex + 1} of {questions.length}
        </span>
        <div className="flex items-center gap-3">
          {streak > 1 && (
            <span className="text-sm font-semibold text-warning">{streak}x streak</span>
          )}
          <span className="text-sm text-muted-foreground">
            Score:{" "}
            <span className="font-bold text-foreground tabular-nums">{score.toLocaleString()}</span>
          </span>
        </div>
      </div>

      {/* Timer bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span
            className={cn(
              "text-3xl font-bold tabular-nums transition-colors",
              timeLeft <= 5 ? "text-destructive" : "text-foreground",
            )}
          >
            {timeLeft}s
          </span>
        </div>
        <Progress
          value={progress}
          className={cn("h-2", timeLeft <= 5 ? "[&>div]:bg-destructive" : "[&>div]:bg-primary")}
        />
      </div>

      {/* Question text */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl text-center">{question.text}</CardTitle>
        </CardHeader>
      </Card>

      {/* Answer buttons */}
      {hasAnswered ? (
        <Card className="p-6 text-center">
          <div className="mb-3">
            {lastResult?.isCorrect ? (
              <p className="text-xl font-semibold text-success">
                Correct! +{lastResult.points.toLocaleString()} points
              </p>
            ) : (
              <p className="text-xl font-semibold text-destructive">Incorrect</p>
            )}
          </div>
          <p className="text-sm text-muted-foreground">Waiting for next question...</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {question.options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => selectAnswer(option.id)}
              disabled={hasAnswered}
              className="group relative rounded-xl border-2 border-border bg-card p-4 md:p-6 text-left transition-all duration-200 hover:border-primary/60 hover:bg-primary/5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 md:w-12 md:h-12 rounded-full flex-shrink-0 border-2 border-white/20 shadow-inner"
                  style={{ backgroundColor: option.color }}
                />
                <span className="font-semibold text-base md:text-lg">{option.text}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
