import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTriviaStore } from "../store";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle } from "lucide-react";

export default function Scoreboard() {
  const questions = useTriviaStore((s) => s.questions);
  const currentIndex = useTriviaStore((s) => s.currentIndex);
  const score = useTriviaStore((s) => s.score);
  const streak = useTriviaStore((s) => s.streak);
  const answers = useTriviaStore((s) => s.answers);

  const correct = answers.filter((a) => a.isCorrect).length;
  const total = answers.length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 md:py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
            Round {currentIndex + 1} Complete
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="rounded-xl bg-card border border-border p-3">
              <p className="text-3xl font-bold tabular-nums text-primary">{score.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Score</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-3">
              <p className="text-3xl font-bold tabular-nums text-success">{correct}</p>
              <p className="text-xs text-muted-foreground mt-1">Correct</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-3">
              <p className="text-3xl font-bold tabular-nums text-warning">{streak}</p>
              <p className="text-xs text-muted-foreground mt-1">Streak</p>
            </div>
          </div>

          {total > 0 && (
            <div className="space-y-1.5 mt-4">
              {answers.map((a, i) => {
                const q = questions.find((q) => q.id === a.questionId);
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
                      a.isCorrect ? "bg-success/10" : "bg-destructive/10",
                    )}
                  >
                    {a.isCorrect ? (
                      <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                    )}
                    <span className="flex-1 truncate">{q?.text ?? `Q${i + 1}`}</span>
                    <span className={cn("font-semibold tabular-nums", a.isCorrect ? "text-success" : "text-destructive")}>
                      {a.isCorrect ? `+${a.points.toLocaleString()}` : "0"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground">Next question coming up...</p>
        </CardContent>
      </Card>
    </div>
  );
}
