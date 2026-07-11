import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTriviaStore } from "../store";
import { cn } from "@/lib/utils";
import { Trophy, CheckCircle, XCircle, RotateCcw, Send } from "lucide-react";

interface FinalPodiumProps {
  onPlayAgain: () => void;
  onSubmitScore: () => void;
  submitting: boolean;
  submitted: boolean;
}

export default function FinalPodium({ onPlayAgain, onSubmitScore, submitting, submitted }: FinalPodiumProps) {
  const score = useTriviaStore((s) => s.score);
  const streak = useTriviaStore((s) => s.streak);
  const answers = useTriviaStore((s) => s.answers);
  const questions = useTriviaStore((s) => s.questions);

  const correct = answers.filter((a) => a.isCorrect).length;
  const total = answers.length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  // Average answer time for correct answers
  const correctTimes = answers.filter((a) => a.isCorrect).map((a) => a.timeMs);
  const avgTimeMs = correctTimes.length > 0
    ? correctTimes.reduce((s, t) => s + t, 0) / correctTimes.length
    : 0;
  const avgTimeSec = (avgTimeMs / 1000).toFixed(1);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 md:py-8">
      {/* Podium header */}
      <div className="text-center mb-6">
        <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gradient-primary mb-2">
          Game Complete!
        </h1>
        <p className="text-2xl font-bold text-foreground tabular-nums">
          {score.toLocaleString()} points
        </p>
        {streak > 1 && (
          <Badge variant="secondary" className="mt-2">
            {streak}x final streak
          </Badge>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl bg-card border border-border p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-success">{correct}/{total}</p>
          <p className="text-xs text-muted-foreground mt-1">Correct</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-primary">{accuracy}%</p>
          <p className="text-xs text-muted-foreground mt-1">Accuracy</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4 text-center">
          <p className="text-2xl font-bold tabular-nums">{avgTimeSec}s</p>
          <p className="text-xs text-muted-foreground mt-1">Avg. Time</p>
        </div>
      </div>

      {/* Question-by-question breakdown */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Round Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
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
                <span className="flex-1 truncate">{q?.text ?? `Question ${i + 1}`}</span>
                <span className={cn("font-semibold tabular-nums text-sm", a.isCorrect ? "text-success" : "text-destructive")}>
                  {a.isCorrect ? `+${a.points.toLocaleString()}` : "0"}
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        {!submitted ? (
          <Button
            size="lg"
            className="w-full glow-primary"
            onClick={onSubmitScore}
            disabled={submitting}
          >
            <Send className="w-4 h-4 mr-2" />
            {submitting ? "Submitting..." : "Submit Score to Leaderboard"}
          </Button>
        ) : (
          <Card className="border-success/40 bg-success/5">
            <CardContent className="py-3 text-center">
              <p className="text-success font-semibold">Score submitted!</p>
            </CardContent>
          </Card>
        )}

        <Button
          size="lg"
          variant="outline"
          className="w-full"
          onClick={onPlayAgain}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Play Again
        </Button>
      </div>
    </div>
  );
}
