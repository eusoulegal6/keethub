import { Canvas } from "./Canvas";
import { Chat } from "./Chat";
import { PlayerList } from "./PlayerList";
import { Button } from "@/components/ui/button";
import { LogOut, Sparkles } from "lucide-react";

interface GameStageProps {
  onLeaveRoom: () => void;
}

export function GameStage({ onLeaveRoom }: GameStageProps) {
  return (
    <div className="px-4 pb-4 pt-4 md:px-5">
      <div className="grid gap-4 xl:h-[calc(100vh-11rem)] xl:min-h-[560px] xl:grid-cols-[260px_minmax(0,1fr)_300px] 2xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <div className="order-2 flex min-h-[360px] flex-col gap-4 xl:order-1 xl:min-h-0">
          <div className="min-h-0 flex-1">
            <PlayerList />
          </div>

          <Button
            onClick={onLeaveRoom}
            variant="outline"
            className="h-12 w-full flex-shrink-0 rounded-lg border-[#D7DDEA] bg-white text-base font-extrabold text-[#7037E8] shadow-sm hover:bg-[#F6F1FF] hover:text-[#7037E8]"
          >
            <LogOut className="mr-2 h-5 w-5" />
            Leave
          </Button>

          <div className="relative hidden flex-shrink-0 rounded-lg border border-[#8BE0DE] bg-white px-5 pb-5 pt-8 text-center shadow-[0_12px_30px_rgba(16,32,74,0.06)] xl:block">
            <div className="absolute -top-5 left-1/2 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full bg-[#FFF1F6] text-[#FF2F85] shadow-sm">
              <Sparkles className="h-6 w-6" />
            </div>
            <p className="text-sm font-black text-[#10B8B5]">Tip from Keet!</p>
            <p className="mt-3 text-sm font-semibold leading-6 text-[#53627D]">
              Big shapes first, then details. Keep it simple and easy to guess.
            </p>
          </div>
        </div>

        <div className="order-1 min-h-[560px] xl:order-2 xl:min-h-0">
          <Canvas />
        </div>

        <div className="order-3 min-h-[420px] xl:min-h-0">
          <Chat />
        </div>
      </div>
    </div>
  );
}
