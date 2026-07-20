import { Star, Zap } from "lucide-react";

export interface ScoreboardPlayer {
  id: string;
  name: string;
  score: number;
  avatar?: unknown;
}

interface Props {
  players: ScoreboardPlayer[];
  questionNumber: number;
  totalQuestions: number;
}

function PlayerAvatar({ name, avatar }: { name: string; avatar: unknown }) {
  const imageUrl = typeof avatar === "string" && /^https?:\/\//.test(avatar) ? avatar : null;

  return (
    <div className="trivia-blitz-scoreboard-avatar" aria-label={`${name}'s avatar`}>
      {imageUrl ? <img src={imageUrl} alt="" /> : name.slice(0, 1).toUpperCase()}
    </div>
  );
}

export default function ScoreboardDisplay({ players, questionNumber, totalQuestions }: Props) {
  const rankedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <main className="trivia-blitz-scoreboard-stage">
      <div className="trivia-blitz-scoreboard-content">
        <header className="trivia-blitz-scoreboard-heading">
          <span className="trivia-blitz-live">
            <Zap className="size-3.5 fill-current" /> Live quiz
          </span>
          <div className="trivia-blitz-scoreboard-title-wrap" aria-hidden="true">
            <i />
            <h1>Scoreboard</h1>
            <i />
          </div>
          <p>
            Question {questionNumber} of {totalQuestions}
          </p>
        </header>

        <section className="trivia-blitz-rankings" aria-label="Current player rankings">
          {rankedPlayers.map((player, index) => (
            <article key={player.id} className={`trivia-blitz-ranking trivia-blitz-ranking-${index + 1}`}>
              <div className="trivia-blitz-rank-medal" aria-label={`Rank ${index + 1}`}>
                <span>{index + 1}</span>
              </div>
              <PlayerAvatar name={player.name} avatar={player.avatar} />
              <strong className="trivia-blitz-ranking-name">{player.name}</strong>
              <strong className="trivia-blitz-ranking-score">{player.score.toLocaleString()}</strong>
              <Star className="trivia-blitz-ranking-star" aria-label="points" />
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
