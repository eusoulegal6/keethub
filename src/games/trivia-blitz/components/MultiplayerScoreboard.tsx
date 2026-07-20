import { Star, Zap } from "lucide-react";
import type { TriviaRoomState } from "../hooks/useTriviaMultiplayer";

interface Props {
  state: TriviaRoomState;
}

function PlayerAvatar({ name, avatar }: { name: string; avatar: unknown }) {
  const imageUrl = typeof avatar === "string" && /^https?:\/\//.test(avatar) ? avatar : null;

  return (
    <div className="trivia-blitz-scoreboard-avatar" aria-label={`${name}'s avatar`}>
      {imageUrl ? <img src={imageUrl} alt="" /> : name.slice(0, 1).toUpperCase()}
    </div>
  );
}

export default function MultiplayerScoreboard({ state }: Props) {
  const players = [...(state.players ?? [])].sort((a, b) => b.score - a.score);

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
            Question {state.room.roundNumber} of {state.room.maxRounds}
          </p>
        </header>

        <section className="trivia-blitz-rankings" aria-label="Current player rankings">
          {players.map((player, index) => (
            <article
              key={player.id}
              className={`trivia-blitz-ranking trivia-blitz-ranking-${index + 1}`}
            >
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
