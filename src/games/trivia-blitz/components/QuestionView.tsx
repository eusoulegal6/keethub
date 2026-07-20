import { useEffect, useRef, type CSSProperties } from "react";
import { FileText, Rocket, Target, Timer, Trophy, UsersRound, Zap } from "lucide-react";
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
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">Loading question...</p>
        </div>
      </div>
    );
  }

  const progress = (timeLeft / question.timeLimit) * 100;

  return (
    <main className="trivia-blitz-question-stage">
      <div className="trivia-blitz-question-content">
        <header className="trivia-blitz-question-heading">
          <span className="trivia-blitz-live">
            <Zap className="size-3.5 fill-current" /> Live quiz
          </span>
          <h1>Trivia Blitz</h1>
          <p>
            Pick a category, <strong>answer fast</strong>, climb the ranks.
          </p>
        </header>

        <section className="trivia-blitz-status" aria-label="Question status">
          <div className="trivia-blitz-status-card">
            <FileText />
            <span>
              Question {currentIndex + 1} of {questions.length}
            </span>
          </div>
          <div className={cn("trivia-blitz-timer", timeLeft <= 5 && "is-urgent")}>
            <Timer />
            <strong>{timeLeft}s</strong>
          </div>
          <div className="trivia-blitz-status-card trivia-blitz-score">
            <UsersRound />
            <span>
              {streak > 1 ? `${streak}x streak · ` : ""}Score: {score.toLocaleString()}
            </span>
          </div>
        </section>
        <div
          className="trivia-blitz-progress"
          aria-label={`${Math.round(progress)}% of time remaining`}
        >
          <span style={{ width: `${progress}%` }} />
        </div>

        <section className="trivia-blitz-question-card">
          <div className="trivia-blitz-question-burst left" aria-hidden="true">
            ☄
          </div>
          <div className="trivia-blitz-question-burst right" aria-hidden="true">
            ☄
          </div>
          <h2>{question.text}</h2>
          <div className="trivia-blitz-answer-grid">
            {question.options.map((option, index) => (
              <button
                key={option.id}
                type="button"
                onClick={() => selectAnswer(option.id)}
                disabled={hasAnswered}
                className={cn(
                  "trivia-blitz-answer",
                  hasAnswered && selectedOptionId === option.id && "is-selected",
                )}
                style={{ "--answer-color": option.color } as CSSProperties}
              >
                <span className="trivia-blitz-answer-letter">
                  {String.fromCharCode(65 + index)}
                </span>
                <span>{option.text}</span>
              </button>
            ))}
          </div>
          {hasAnswered && (
            <p className="trivia-blitz-answer-wait">
              {lastResult?.isCorrect
                ? `Correct! +${lastResult.points.toLocaleString()} points`
                : "Answer locked in — get ready for the reveal!"}
            </p>
          )}
        </section>

        <footer className="trivia-blitz-tips">
          <div>
            <span className="trivia-blitz-tip-icon pink">
              <Rocket />
            </span>
            <p>
              <strong>Answer fast!</strong>
              <small>
                Earn up to <b>2x points</b> for speed.
              </small>
            </p>
          </div>
          <div>
            <span className="trivia-blitz-tip-icon green">
              <Target />
            </span>
            <p>
              <strong>Stay accurate!</strong>
              <small>Correct answers keep your streak.</small>
            </p>
          </div>
          <div>
            <span className="trivia-blitz-tip-icon gold">
              <Trophy />
            </span>
            <p>
              <strong>Climb the ranks!</strong>
              <small>Top players lead the leaderboard.</small>
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
