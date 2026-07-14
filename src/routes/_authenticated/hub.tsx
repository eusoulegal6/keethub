import type { CSSProperties } from "react";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export const Route = createFileRoute("/_authenticated/hub")({
  component: HubLayout,
});

const primkeetHubTheme = {
  "--background": "#FBFDFF",
  "--foreground": "#10204A",
  "--card": "#FFFFFF",
  "--card-foreground": "#10204A",
  "--popover": "#FFFFFF",
  "--popover-foreground": "#10204A",
  "--primary": "#FF3B8D",
  "--primary-foreground": "#FFFFFF",
  "--secondary": "#ECFBFA",
  "--secondary-foreground": "#10204A",
  "--muted": "#F4F7FB",
  "--muted-foreground": "#667085",
  "--accent": "#FFF1F6",
  "--accent-foreground": "#10204A",
  "--destructive": "#E5484D",
  "--destructive-foreground": "#FFFFFF",
  "--success": "#08AAA7",
  "--warning": "#FF9418",
  "--border": "#E8ECF4",
  "--input": "#E8ECF4",
  "--ring": "#08AAA7",
  "--game-card": "#FFFFFF",
  "--glow": "rgba(255, 59, 141, 0.22)",
  "--sidebar": "#FFFFFF",
  "--sidebar-foreground": "#10204A",
  "--sidebar-primary": "#FF3B8D",
  "--sidebar-primary-foreground": "#FFFFFF",
  "--sidebar-accent": "#FFF1F6",
  "--sidebar-accent-foreground": "#10204A",
  "--sidebar-border": "#E8ECF4",
  "--sidebar-ring": "#08AAA7",
  colorScheme: "light",
} as CSSProperties;

function HubLayout() {
  return (
    <SidebarProvider className="min-h-screen bg-[#FBFDFF] text-[#10204A]" style={primkeetHubTheme}>
      <div className="flex min-h-screen w-full bg-[#FBFDFF] text-[#10204A]">
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col bg-[#FBFDFF]">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-[#E8ECF4] bg-white/92 px-4 shadow-[0_8px_24px_rgba(16,32,74,0.04)] backdrop-blur md:px-6">
            <SidebarTrigger className="h-10 w-10 rounded-full border border-[#E8ECF4] bg-white text-[#10204A] shadow-sm hover:bg-[#ECFBFA] hover:text-[#08AAA7]" />
            <Link
              to="/hub"
              className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08AAA7] focus-visible:ring-offset-2 md:hidden"
            >
              <img
                src="/primkeet-logo.png"
                alt="PrimKeet"
                width={176}
                height={60}
                className="h-9 w-auto object-contain"
              />
            </Link>
            <div className="flex-1" />
          </header>
          <main className="flex-1">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
