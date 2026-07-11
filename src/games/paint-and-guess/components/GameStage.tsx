import { Canvas } from "./Canvas";
import { Chat } from "./Chat";
import { PlayerList } from "./PlayerList";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface GameStageProps {
  onLeaveRoom: () => void;
}

/**
 * Game stage - active gameplay with canvas
 * Maximized canvas area with minimal sidebars
 */
export function GameStage({ onLeaveRoom }: GameStageProps) {
  return (
    <div className="container mx-auto p-1 sm:p-2 md:p-4 h-[calc(100vh-5rem)] max-h-screen overflow-y-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3 md:gap-4 auto-rows-fr">
        {/* Left Sidebar - Players (hidden on mobile, shown on tablet+) */}
        <div className="lg:col-span-2 hidden md:flex flex-col min-h-0 lg:max-h-full">
          <div className="flex-shrink-0 overflow-y-auto mb-2 max-h-[200px] lg:max-h-none">
            <PlayerList />
          </div>
          <Button
            onClick={onLeaveRoom}
            variant="outline"
            className="w-full flex-shrink-0 text-xs sm:text-sm"
            size="sm"
          >
            <LogOut className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
            Leave
          </Button>
        </div>

        {/* Main Canvas Area - takes most of the space (full width on mobile) */}
        <div className="col-span-1 lg:col-span-8 flex flex-col min-h-[400px] sm:min-h-[500px] lg:min-h-0 lg:max-h-full">
          <Canvas />
        </div>

        {/* Right Sidebar - Chat (full width on mobile, sidebar on desktop) */}
        <div className="col-span-1 lg:col-span-2 flex flex-col min-h-[250px] sm:min-h-[300px] lg:min-h-0 lg:max-h-full">
          <Chat />
        </div>
      </div>
    </div>
  );
}

