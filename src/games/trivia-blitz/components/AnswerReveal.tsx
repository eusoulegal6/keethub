import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTriviaStore } from "../store";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle } from "lucide-react";

export default function AnswerReveal() {
  const questions = useTriviaStore((s) => s.questions);
  const currentIndex = useTriviaStore((s) => s.currentIndex);
  const selectedOptionId = useTriviaStore((s) => s.selectedOptionId);
  const lastResult = useTriviaStore((s) => s.lastResult);
  const score = useTriviaStore((s) => s.score);

  const question = questions[currentIndex];
  if (!question) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 md:py-8">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-foreground font-medium">
          Question {currentIndex + 1} of {questions.length}
        </span>
        <span className="text-sm text-muted-foreground">
          Score: <span className="font-bold text-foreground tabular-nums">{score.toLocaleString()}</span>
        </span>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl text-center">{question.text}</CardTitle>
        </CardHeader>
      </Card>

      <div className="space-y-3 mb-6">
        {question.options.map((option) => {
          const isCorrect = option.id === question.correctOptionId;
          const isSelected = option.id === selectedOptionId;
          const showAsCorrect = isCorrect;
          const showAsWrong = isSelected && !isCorrect;

          return (
            <div
              key={option.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border-2 p-4 transition-colors",
                showAsCorrect
                  ? "border-success/60 bg-success/10"
                  : showAsWrong
                    ? "border-destructive/60 bg-destructive/10"
                    : "border-border bg-card opacity-60",
              )}
            >
              <div
                className="w-10 h-10 rounded-full flex-shrink-0 border-2 border-white/20"
                style={{ backgroundColor: option.color }}
              />
              <span className="font-semibold text-base flex-1">{option.text}</span>
              {showAsCorrect && <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />}
              {showAsWrong && <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />}
            </div>
          );
        })}
      </div>

      {lastResult && (
        <Card className={cn(lastResult.isCorrect ? "border-success/40" : "border-destructive/40")}>
          <CardContent className="py-3 text-center">
            {lastResult.isCorrect ? (
              <p className="text-lg font-semibold text-success">
                +{lastResult.points.toLocaleString()} points
              </p>
            ) : (
              <p className="text-lg font-semibold text-destructive">
                Incorrect — no points this round
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
