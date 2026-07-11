import { useState, useEffect, useRef } from "react";
import { useGame } from "@/games/paint-and-guess";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, MessageSquare } from "lucide-react";

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
      // If game is active and player is not drawer, send as guess
      sendGuess(message);
    } else {
      // Otherwise send as chat message
      sendChatMessage(message);
    }
    setMessage("");
  };

  return (
    <Card className="h-full flex flex-col max-h-[600px] lg:max-h-full">
      <CardHeader className="flex-shrink-0 pb-2">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          {isGameActive && !isDrawer
            ? "Guess the Word"
            : "Chat"}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 min-h-0 pt-2">
        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
          <div className="space-y-2">
            {chatMessages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {isGameActive
                  ? isDrawer
                    ? "Watch the guesses appear here!"
                    : "Start guessing the word!"
                  : "Chat with other players"}
              </p>
            )}
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`p-2 rounded-lg ${
                  msg.type === "correct-guess"
                    ? "bg-green-500/20 border border-green-500"
                    : msg.type === "wrong-guess"
                    ? "bg-muted"
                    : "bg-muted"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-sm">{msg.player.name}</span>
                  {msg.type === "correct-guess" && (
                    <Badge variant="default" className="text-xs bg-green-500">
                      Correct!
                    </Badge>
                  )}
                </div>
                <p className="text-sm">{msg.message}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
        <form onSubmit={handleSubmit} className="mt-4 flex gap-2 flex-shrink-0">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              isGameActive && !isDrawer
                ? "Type your guess..."
                : "Type a message..."
            }
            disabled={(!isGameActive && gameState.players.length < 2) || gameState.phase === "round-ended"}
          />
          <Button type="submit" size="icon" disabled={gameState.phase === "round-ended"}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
        {isDrawer && isGameActive && gameState.phase === "drawing" && (
          <p className="text-xs text-muted-foreground mt-2 text-center flex-shrink-0">
            You're drawing! Watch the guesses appear above.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

