import { useEffect, useRef, useState } from "react";
import { useGame } from "@/games/paint-and-guess";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MessageSquare, Send, ShieldCheck } from "lucide-react";
import { PlayerAvatar } from "./PlayerAvatar";

function formatMessageTime(timestamp: number) {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (elapsedSeconds < 60) return "Just now";

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  return `${elapsedHours}h ago`;
}

export function Chat() {
  const { gameState, isGameActive, isDrawer, sendGuess, sendChatMessage, chatMessages } = useGame();
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    if (isGameActive && !isDrawer) {
      sendGuess(message);
    } else {
      sendChatMessage(message);
    }
    setMessage("");
  };

  const isInputDisabled =
    (!isGameActive && gameState.players.length < 2) || gameState.phase === "round-ended";

  return (
    <aside className="relative flex h-full min-h-[320px] flex-col overflow-hidden rounded-lg border border-[#E6EAF2] bg-white p-4 shadow-[0_14px_36px_rgba(16,32,74,0.08)]">
      <div className="pointer-events-none absolute right-5 top-16 h-16 w-16 rounded-full border-2 border-[#8BE0DE] opacity-60" />
      <div className="pointer-events-none absolute bottom-28 left-5 h-2 w-2 rounded-full bg-[#10B8B5]" />
      <div className="pointer-events-none absolute bottom-24 right-8 h-2 w-2 rounded-full bg-[#FF2F85]" />

      <div className="mb-4 flex flex-shrink-0 items-center gap-2 text-[#10204A]">
        <MessageSquare className="h-5 w-5 text-[#7037E8]" />
        <h2 className="text-lg font-extrabold">Chat</h2>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        {chatMessages.length === 0 && (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center px-4 text-center">
            <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#8BE0DE] bg-[#ECFBFA] text-[#10B8B5]">
              <MessageSquare className="h-11 w-11" />
            </div>
            <p className="text-base font-extrabold text-[#10204A]">
              {isGameActive && !isDrawer ? "Let's get guessing!" : "Watch the guesses appear here!"}
            </p>
            <p className="mt-2 text-sm font-medium leading-6 text-[#667085]">
              {isGameActive && !isDrawer
                ? "Type your best guess when the drawing starts."
                : "When players guess, they'll appear here."}
            </p>
          </div>
        )}

        {chatMessages.map((msg) => {
          const fullPlayer = gameState.players.find((player) => player.id === msg.player.id);
          const bubbleClass =
            msg.type === "correct-guess"
              ? "border-[#10B8B5] bg-[#ECFBFA] text-[#087E7D]"
              : msg.type === "wrong-guess"
                ? "border-[#E6EAF2] bg-[#F8FAFD] text-[#415070]"
                : msg.type === "system"
                  ? "border-[#F3E7BD] bg-[#FFF8D9] text-[#705200]"
                  : "border-[#E6EAF2] bg-white text-[#415070]";

          return (
            <div key={msg.id} className="flex items-start gap-3">
              <PlayerAvatar player={fullPlayer ?? msg.player} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className={cn(
                      "truncate text-sm font-extrabold",
                      fullPlayer?.id === gameState.selfId ? "text-[#FF2F85]" : "text-[#415070]",
                    )}
                  >
                    {msg.player.name}
                    {fullPlayer?.id === gameState.selfId && " (You)"}
                  </span>
                  <span className="ml-auto flex-shrink-0 text-xs font-medium text-[#98A2B3]">
                    {formatMessageTime(msg.timestamp)}
                  </span>
                </div>
                <div
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm leading-6 shadow-sm",
                    bubbleClass,
                  )}
                >
                  {msg.type === "correct-guess" && (
                    <Badge className="mb-2 bg-[#10B8B5] text-xs font-bold text-white">
                      Correct
                    </Badge>
                  )}
                  <p className="break-words">{msg.message}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-shrink-0 items-center gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={isGameActive && !isDrawer ? "Type your guess..." : "Type a message..."}
          disabled={isInputDisabled}
          className="h-12 rounded-lg border-[#DDE4EF] bg-white px-4 text-[#10204A] placeholder:text-[#98A2B3] focus-visible:ring-[#10B8B5]"
        />
        <Button
          type="submit"
          size="icon"
          disabled={gameState.phase === "round-ended"}
          className="h-12 w-12 flex-shrink-0 rounded-full bg-[#FF2F85] text-white shadow-[0_12px_24px_rgba(255,47,133,0.28)] hover:bg-[#E92778]"
          aria-label="Send message"
        >
          <Send className="h-5 w-5" />
        </Button>
      </form>

      <div className="mt-4 flex flex-shrink-0 items-center gap-2 text-xs font-bold text-[#667085]">
        <ShieldCheck className="h-4 w-4 text-[#10B8B5]" />
        Be kind and have fun
      </div>
    </aside>
  );
}
