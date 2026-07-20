import type { TriviaRoomState } from "../hooks/useTriviaMultiplayer";
import ScoreboardDisplay from "./ScoreboardDisplay";

interface Props {
  state: TriviaRoomState;
}

export default function MultiplayerScoreboard({ state }: Props) {
  return (
    <ScoreboardDisplay
      players={state.players}
      questionNumber={state.room.roundNumber}
      totalQuestions={state.room.maxRounds}
    />
  );
}
