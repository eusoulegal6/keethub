import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play } from "lucide-react";
import { useTriviaStore } from "../store";
import { cn } from "@/lib/utils";

export default function GameSetup() {
  const quizzes = useTriviaStore((s) => s.availableQuizzes);
  const selectedId = useTriviaStore((s) => s.categoryId);
  const startGame = useTriviaStore((s) => s.startGame);

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 md:py-8">
      <div className="text-center mb-6 md:mb-8">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-gradient-primary mb-3">
          Trivia Blitz
        </h1>
        <p className="text-muted-foreground text-base md:text-lg max-w-md mx-auto">
          Pick a category, answer fast, climb the ranks.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {quizzes.map((quiz) => (
          <button
            key={quiz.id}
            type="button"
            onClick={() => startGame(quiz.id)}
            className={cn(
              "text-left rounded-xl border-2 p-4 transition-all duration-200 hover:border-primary/50 hover:bg-primary/5",
              selectedId === quiz.id
                ? "border-primary bg-primary/10"
                : "border-border bg-card",
            )}
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl flex-shrink-0">{quiz.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-base">{quiz.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {quiz.questionCount} Qs
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {quiz.description}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <Card className="mt-6 border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Play className="w-4 h-4" />
            How it works
          </CardTitle>
          <CardDescription>Single-player speed quiz</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>7 questions per game. Base 1,000 points per correct answer.</p>
          <p>Answer faster for up to a 2x speed bonus.</p>
          <p>Consecutive correct answers earn up to 500 streak points.</p>
          <p>Submit your final score to the leaderboard at the end.</p>
        </CardContent>
      </Card>
    </div>
  );
}
