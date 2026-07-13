import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { ArrowLeft, Check, Clipboard, Crown, LogOut, Send, Users } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { getGameBySlug } from "@/lib/games.functions";
import { submitScore } from "@/lib/scores.functions";

const balderdashGameQuery = {
  queryKey: ["game", "balderdash"],
  queryFn: () => getGameBySlug({ data: { slug: "balderdash" } }),
  staleTime: 60_000,
};

export const Route = createFileRoute("/_authenticated/hub/games/balderdash")({
  ssr: false,
  component: BalderdashRoute,
});

type Phase =
  "lobby" | "deck_selection" | "answer_submission" | "voting" | "round_results" | "finished";

type Player = {
  id: string;
  userId: string;
  name: string;
  avatar: unknown;
  score: number;
  isReady: boolean;
  isConnected: boolean;
  roundPoints: number;
};

type SubmissionStatus = {
  playerId: string;
  submitted: boolean;
};

type VoteInfo = {
  playerId: string;
  name: string;
};

type AnswerOption = {
  id: string;
  answer: string;
  isCorrect: boolean | null;
  authorPlayerId: string | null;
  authorName: string | null;
  votes: VoteInfo[];
};

type RoomState = {
  success: boolean;
  room: {
    id: string;
    code: string;
    name: string;
    phase: Phase;
    deck: string | null;
    roundNumber: number;
    maxRounds: number;
    maxPlayers: number;
    ownerId: string;
    selectorPlayerId: string | null;
    promptWord: string | null;
    correctAnswer: string | null;
  };
  selfPlayerId: string;
  isOwner: boolean;
  players: Player[];
  submissions: SubmissionStatus[];
  options: AnswerOption[];
  self: {
    submitted: boolean;
    votedOptionId: string | null;
  };
};

type RpcResult<T> = T & {
  success?: boolean;
  error?: string;
};

type RpcClient = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

const ROOM_STORAGE_KEY = "balderdash-room-id";

const DECKS = [
  {
    id: "words",
    label: "Words",
    description: "Odd words with real dictionary definitions.",
  },
  {
    id: "acronyms",
    label: "Acronyms",
    description: "Business, school, finance, and everyday abbreviations.",
  },
] as const;

async function callRpc<T>(fn: string, args?: Record<string, unknown>): Promise<RpcResult<T>> {
  const { data, error } = await (supabase as unknown as RpcClient).rpc(fn, args);
  if (error) throw new Error(error.message);
  const payload = data as RpcResult<T>;
  if (payload?.success === false) {
    throw new Error(payload.error ?? "Action failed");
  }
  return payload;
}

function BalderdashRoute() {
  const queryClient = useQueryClient();
  const submitScoreFn = useServerFn(submitScore);
  const { data: game } = useQuery(balderdashGameQuery);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [state, setState] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const submittedRoomRef = useRef<string | null>(null);

  const loadState = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const roomState = await callRpc<RoomState>("get_balderdash_room_state", {
        p_room_id: id,
      });
      setState(roomState as RoomState);
    } catch (error) {
      localStorage.removeItem(ROOM_STORAGE_KEY);
      setRoomId(null);
      setState(null);
      if (error instanceof Error) toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedRoomId = localStorage.getItem(ROOM_STORAGE_KEY);
    if (!savedRoomId) {
      setLoading(false);
      return;
    }
    setRoomId(savedRoomId);
    void loadState(savedRoomId);
  }, [loadState]);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`balderdash:${roomId}`, {
        config: { broadcast: { self: false } },
      })
      .on("broadcast", { event: "state-changed" }, () => {
        void loadState(roomId);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current === channel) channelRef.current = null;
      void channel.unsubscribe();
    };
  }, [loadState, roomId]);

  useEffect(() => {
    if (!roomId) return;
    const timer = window.setInterval(() => {
      void loadState(roomId);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [loadState, roomId]);

  useEffect(() => {
    if (!state || !game || state.room.phase !== "finished") return;
    if (submittedRoomRef.current === state.room.id) return;

    const selfPlayer = state.players.find((player) => player.id === state.selfPlayerId);
    if (!selfPlayer) return;

    submittedRoomRef.current = state.room.id;

    const finalRank =
      [...state.players]
        .sort((a, b) => b.score - a.score)
        .findIndex((player) => player.id === selfPlayer.id) + 1;

    void (async () => {
      try {
        await submitScoreFn({
          data: {
            gameId: game.id,
            score: selfPlayer.score,
            metadata: {
              roomId: state.room.id,
              roomCode: state.room.code,
              finalRank,
              playerCount: state.players.length,
              maxRounds: state.room.maxRounds,
            },
          },
        });
        queryClient.invalidateQueries({ queryKey: ["game-leaderboard", game.id] });
        queryClient.invalidateQueries({ queryKey: ["global-leaderboard"] });
        toast.success("Final score submitted to leaderboard");
      } catch (error) {
        submittedRoomRef.current = null;
        toast.error(error instanceof Error ? error.message : "Failed to submit final score");
      }
    })();
  }, [game, queryClient, state, submitScoreFn]);

  const notifyRoom = useCallback(() => {
    void channelRef.current?.send({
      type: "broadcast",
      event: "state-changed",
      payload: { at: Date.now() },
    });
  }, []);

  const runAction = useCallback(
    async (label: string, fn: string, args: Record<string, unknown>, after?: () => void) => {
      if (!roomId) return;
      setAction(label);
      try {
        await callRpc(fn, args);
        await loadState(roomId);
        notifyRoom();
        after?.();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Action failed");
      } finally {
        setAction(null);
      }
    },
    [loadState, notifyRoom, roomId],
  );

  const leaveRoom = useCallback(async () => {
    if (!roomId) return;
    setAction("leave");
    try {
      await callRpc("leave_balderdash_room", { p_room_id: roomId });
      notifyRoom();
      localStorage.removeItem(ROOM_STORAGE_KEY);
      setRoomId(null);
      setState(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to leave room");
    } finally {
      setAction(null);
    }
  }, [notifyRoom, roomId]);

  if (loading && !state) {
    return (
      <PageShell>
        <div className="min-h-[50vh] grid place-items-center text-muted-foreground">
          Loading room...
        </div>
      </PageShell>
    );
  }

  if (!roomId || !state) {
    return (
      <PageShell>
        <JoinCreatePanel
          onEnterRoom={(id) => {
            localStorage.setItem(ROOM_STORAGE_KEY, id);
            setRoomId(id);
            void loadState(id);
          }}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <RoomView state={state} action={action} runAction={runAction} leaveRoom={leaveRoom} />
    </PageShell>
  );
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 py-5 md:px-10 md:py-8 max-w-6xl mx-auto">
      <Link
        to="/hub"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-5"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to library
      </Link>
      {children}
    </div>
  );
}

function JoinCreatePanel({ onEnterRoom }: { onEnterRoom: (id: string) => void }) {
  const [roomName, setRoomName] = useState("Balderdash Room");
  const [roomCode, setRoomCode] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const createRoom = async (event: FormEvent) => {
    event.preventDefault();
    setBusy("create");
    try {
      const result = await callRpc<{ roomId: string; roomCode: string }>("create_balderdash_room", {
        p_room_name: roomName,
        p_max_rounds: 5,
        p_max_players: 8,
      });
      toast.success(`Room ${result.roomCode} created`);
      onEnterRoom(result.roomId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create room");
    } finally {
      setBusy(null);
    }
  };

  const joinRoom = async (event: FormEvent) => {
    event.preventDefault();
    const code = roomCode.replace(/\D/g, "");
    if (code.length !== 6) {
      toast.error("Enter a six-digit room code");
      return;
    }

    setBusy("join");
    try {
      const result = await callRpc<{ roomId: string }>("join_balderdash_room", {
        p_room_code: code,
      });
      onEnterRoom(result.roomId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to join room");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-5 md:grid-cols-[1.2fr_0.8fr]">
      <section>
        <Badge variant="secondary" className="mb-3">
          Party
        </Badge>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Balderdash</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Make up a fake definition, vote for the answer you trust, and score when other players
          believe your bluff.
        </p>
      </section>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Create room</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createRoom} className="space-y-3">
              <Input
                value={roomName}
                onChange={(event) => setRoomName(event.target.value)}
                maxLength={40}
                placeholder="Room name"
              />
              <Button type="submit" className="w-full" disabled={busy !== null}>
                {busy === "create" ? "Creating..." : "Create room"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Join room</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={joinRoom} className="space-y-3">
              <Input
                value={roomCode}
                onChange={(event) => setRoomCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                maxLength={6}
                placeholder="Six-digit code"
              />
              <Button type="submit" variant="outline" className="w-full" disabled={busy !== null}>
                {busy === "join" ? "Joining..." : "Join room"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RoomView({
  state,
  action,
  runAction,
  leaveRoom,
}: {
  state: RoomState;
  action: string | null;
  runAction: (
    label: string,
    fn: string,
    args: Record<string, unknown>,
    after?: () => void,
  ) => Promise<void>;
  leaveRoom: () => Promise<void>;
}) {
  const connectedPlayers = state.players.filter((player) => player.isConnected);
  const selfPlayer = state.players.find((player) => player.id === state.selfPlayerId);
  const selector = state.players.find((player) => player.id === state.room.selectorPlayerId);
  const allReady =
    connectedPlayers.length >= 2 && connectedPlayers.every((player) => player.isReady);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
      <div className="space-y-5">
        <RoomHeader state={state} leaveRoom={leaveRoom} action={action} />
        {state.room.phase === "lobby" && (
          <LobbyStage state={state} allReady={allReady} action={action} runAction={runAction} />
        )}
        {state.room.phase === "deck_selection" && (
          <DeckSelectionStage
            state={state}
            selectorName={selector?.name ?? "the selector"}
            action={action}
            runAction={runAction}
          />
        )}
        {state.room.phase === "answer_submission" && (
          <SubmissionStage state={state} action={action} runAction={runAction} />
        )}
        {state.room.phase === "voting" && (
          <VotingStage state={state} action={action} runAction={runAction} />
        )}
        {state.room.phase === "round_results" && (
          <ResultsStage state={state} action={action} runAction={runAction} />
        )}
        {state.room.phase === "finished" && <FinishedStage state={state} />}
      </div>

      <PlayerPanel
        players={state.players}
        selfPlayerId={state.selfPlayerId}
        ownerId={state.room.ownerId}
        selfName={selfPlayer?.name}
      />
    </div>
  );
}

function RoomHeader({
  state,
  action,
  leaveRoom,
}: {
  state: RoomState;
  action: string | null;
  leaveRoom: () => Promise<void>;
}) {
  const copyCode = () => {
    void navigator.clipboard.writeText(state.room.code);
    toast.success("Room code copied");
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{state.room.name}</h1>
          <Badge variant="outline">{phaseLabel(state.room.phase)}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Round {Math.max(state.room.roundNumber, 1)} of {state.room.maxRounds}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={copyCode}>
          <Clipboard className="w-4 h-4 mr-1" />
          {state.room.code}
        </Button>
        <Button variant="ghost" onClick={() => void leaveRoom()} disabled={action === "leave"}>
          <LogOut className="w-4 h-4 mr-1" />
          Leave
        </Button>
      </div>
    </div>
  );
}

function LobbyStage({
  state,
  allReady,
  action,
  runAction,
}: {
  state: RoomState;
  allReady: boolean;
  action: string | null;
  runAction: (label: string, fn: string, args: Record<string, unknown>) => Promise<void>;
}) {
  const self = state.players.find((player) => player.id === state.selfPlayerId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lobby</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Share the room code. Everyone must be ready before the host starts.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={self?.isReady ? "secondary" : "default"}
            disabled={action !== null}
            onClick={() =>
              runAction("ready", "set_balderdash_ready", {
                p_room_id: state.room.id,
                p_is_ready: !self?.isReady,
              })
            }
          >
            <Check className="w-4 h-4 mr-1" />
            {self?.isReady ? "Ready" : "Ready up"}
          </Button>
          {state.isOwner && (
            <Button
              disabled={!allReady || action !== null}
              onClick={() =>
                runAction("start", "start_balderdash_room", {
                  p_room_id: state.room.id,
                })
              }
            >
              Start game
            </Button>
          )}
        </div>
        {!state.isOwner && (
          <p className="text-sm text-muted-foreground">Waiting for the host to start the game.</p>
        )}
      </CardContent>
    </Card>
  );
}

function DeckSelectionStage({
  state,
  selectorName,
  action,
  runAction,
}: {
  state: RoomState;
  selectorName: string;
  action: string | null;
  runAction: (label: string, fn: string, args: Record<string, unknown>) => Promise<void>;
}) {
  const isSelector = state.selfPlayerId === state.room.selectorPlayerId;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose a deck</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isSelector ? (
          <>
            <p className="text-sm text-muted-foreground">Pick the prompt deck for this round.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {DECKS.map((deck) => (
                <button
                  key={deck.id}
                  disabled={action !== null}
                  onClick={() =>
                    void runAction("deck", "choose_balderdash_deck", {
                      p_room_id: state.room.id,
                      p_deck: deck.id,
                    })
                  }
                  className="rounded-xl border border-border bg-background p-4 text-left transition hover:border-primary/60 disabled:opacity-50"
                >
                  <p className="font-semibold">{deck.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{deck.description}</p>
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="text-muted-foreground">Waiting for {selectorName} to choose a deck.</p>
        )}
      </CardContent>
    </Card>
  );
}

function SubmissionStage({
  state,
  action,
  runAction,
}: {
  state: RoomState;
  action: string | null;
  runAction: (
    label: string,
    fn: string,
    args: Record<string, unknown>,
    after?: () => void,
  ) => Promise<void>;
}) {
  const [answer, setAnswer] = useState("");
  const submittedByPlayer = new Map(
    state.submissions.map((entry) => [entry.playerId, entry.submitted]),
  );

  const submitAnswer = (event: FormEvent) => {
    event.preventDefault();
    void runAction(
      "submit",
      "submit_balderdash_answer",
      {
        p_room_id: state.room.id,
        p_answer: answer,
      },
      () => setAnswer(""),
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Write a bluff</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <PromptBlock term={state.room.promptWord} deck={state.room.deck} />
        {state.self.submitted ? (
          <p className="rounded-lg border border-border bg-background p-3 text-sm text-muted-foreground">
            Your answer is locked in. Waiting for the rest of the room.
          </p>
        ) : (
          <form onSubmit={submitAnswer} className="space-y-3">
            <Textarea
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              maxLength={240}
              placeholder="Invent a definition that sounds real..."
              className="min-h-28"
            />
            <Button type="submit" disabled={answer.trim().length < 3 || action !== null}>
              <Send className="w-4 h-4 mr-1" />
              Submit bluff
            </Button>
          </form>
        )}
        <StatusList
          players={state.players.filter((player) => player.isConnected)}
          isDone={(player) => submittedByPlayer.get(player.id) === true}
          doneLabel="Submitted"
          waitingLabel="Writing"
        />
      </CardContent>
    </Card>
  );
}

function VotingStage({
  state,
  action,
  runAction,
}: {
  state: RoomState;
  action: string | null;
  runAction: (label: string, fn: string, args: Record<string, unknown>) => Promise<void>;
}) {
  const [selected, setSelected] = useState(state.self.votedOptionId ?? "");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pick the real answer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <PromptBlock term={state.room.promptWord} deck={state.room.deck} />
        <div className="grid gap-3">
          {state.options.map((option, index) => {
            const active = selected === option.id || state.self.votedOptionId === option.id;
            return (
              <button
                key={option.id}
                disabled={state.self.votedOptionId !== null || action !== null}
                onClick={() => setSelected(option.id)}
                className={`rounded-xl border p-4 text-left transition ${
                  active
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background hover:border-primary/50"
                } disabled:opacity-80`}
              >
                <span className="text-xs text-muted-foreground">Option {index + 1}</span>
                <p className="mt-1">{option.answer}</p>
              </button>
            );
          })}
        </div>
        {state.self.votedOptionId ? (
          <p className="text-sm text-muted-foreground">Vote locked. Waiting for everyone else.</p>
        ) : (
          <Button
            disabled={!selected || action !== null}
            onClick={() =>
              runAction("vote", "vote_balderdash_answer", {
                p_room_id: state.room.id,
                p_option_id: selected,
              })
            }
          >
            Lock vote
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ResultsStage({
  state,
  action,
  runAction,
}: {
  state: RoomState;
  action: string | null;
  runAction: (label: string, fn: string, args: Record<string, unknown>) => Promise<void>;
}) {
  const sortedPlayers = useMemo(
    () => [...state.players].sort((a, b) => b.score - a.score),
    [state.players],
  );
  const isFinalRound = state.room.roundNumber >= state.room.maxRounds;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Round results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-xl border border-success/40 bg-success/5 p-4">
          <p className="text-xs uppercase text-muted-foreground">Real answer</p>
          <p className="mt-1 text-lg font-semibold">{state.room.correctAnswer}</p>
        </div>
        <div className="grid gap-3">
          {state.options.map((option) => (
            <div
              key={option.id}
              className={`rounded-xl border p-4 ${
                option.isCorrect ? "border-success/50" : "border-border"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{option.answer}</p>
                {option.isCorrect ? (
                  <Badge>Real answer</Badge>
                ) : (
                  <Badge variant="secondary">Bluff by {option.authorName ?? "unknown"}</Badge>
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Votes:{" "}
                {option.votes.length > 0
                  ? option.votes.map((vote) => vote.name).join(", ")
                  : "None"}
              </p>
            </div>
          ))}
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Score changes</p>
          <div className="grid gap-2">
            {sortedPlayers.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-sm"
              >
                <span>{player.name}</span>
                <span className="font-semibold">
                  +{player.roundPoints} this round / {player.score} total
                </span>
              </div>
            ))}
          </div>
        </div>
        {state.isOwner ? (
          <Button
            disabled={action !== null}
            onClick={() =>
              runAction("next", "next_balderdash_round", {
                p_room_id: state.room.id,
              })
            }
          >
            {isFinalRound ? "Show final scores" : "Next round"}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Waiting for the host to continue.</p>
        )}
      </CardContent>
    </Card>
  );
}

function FinishedStage({ state }: { state: RoomState }) {
  const sortedPlayers = [...state.players].sort((a, b) => b.score - a.score);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Final scores</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedPlayers.map((player, index) => (
          <div
            key={player.id}
            className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 text-center text-sm text-muted-foreground">{index + 1}</span>
              <span className="font-medium">{player.name}</span>
            </div>
            <span className="text-lg font-bold tabular-nums">{player.score}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function PromptBlock({ term, deck }: { term: string | null; deck: string | null }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <p className="text-xs uppercase text-muted-foreground">
        {deck === "acronyms" ? "Acronym" : "Word"}
      </p>
      <p className="mt-1 text-3xl font-extrabold tracking-tight">{term}</p>
    </div>
  );
}

function StatusList({
  players,
  isDone,
  doneLabel,
  waitingLabel,
}: {
  players: Player[];
  isDone: (player: Player) => boolean;
  doneLabel: string;
  waitingLabel: string;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {players.map((player) => {
        const done = isDone(player);
        return (
          <div
            key={player.id}
            className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-sm"
          >
            <span>{player.name}</span>
            <Badge variant={done ? "default" : "outline"}>{done ? doneLabel : waitingLabel}</Badge>
          </div>
        );
      })}
    </div>
  );
}

function PlayerPanel({
  players,
  selfPlayerId,
  ownerId,
  selfName,
}: {
  players: Player[];
  selfPlayerId: string;
  ownerId: string;
  selfName?: string;
}) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="w-4 h-4" />
          Players
        </CardTitle>
        {selfName && <p className="text-xs text-muted-foreground">You are {selfName}</p>}
      </CardHeader>
      <CardContent className="space-y-2">
        {sorted.map((player) => (
          <div
            key={player.id}
            className={`rounded-lg border px-3 py-2 ${
              player.id === selfPlayerId
                ? "border-primary/60 bg-primary/10"
                : "border-border bg-background"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <p className="truncate text-sm font-medium">{player.name}</p>
                  {player.userId === ownerId && <Crown className="h-3.5 w-3.5 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground">
                  {player.isConnected ? "Connected" : "Disconnected"}
                </p>
              </div>
              <span className="font-bold tabular-nums">{player.score}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function phaseLabel(phase: Phase): string {
  switch (phase) {
    case "lobby":
      return "Lobby";
    case "deck_selection":
      return "Deck selection";
    case "answer_submission":
      return "Submitting";
    case "voting":
      return "Voting";
    case "round_results":
      return "Results";
    case "finished":
      return "Finished";
  }
}
