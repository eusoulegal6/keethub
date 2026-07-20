import type { CSSProperties } from "react";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Input } from "@/components/ui/input";
import { AvatarPreview } from "@/components/avatar/AvatarPreview";
import { useHubStore } from "@/stores/hub-store";
import { useProfileStore } from "@/stores/profile-store";

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
  const search = useHubStore((state) => state.search);
  const setSearch = useHubStore((state) => state.setSearch);
  const { avatarConfig } = useProfileStore();
  return (
    <SidebarProvider className="min-h-screen bg-[#FBFDFF] text-[#10204A]" style={primkeetHubTheme}>
      <div className="flex min-h-screen w-full bg-[#FBFDFF] text-[#10204A]">
        <div className="md:hidden">
          <AppSidebar />
        </div>
        <SidebarInset className="flex flex-1 flex-col bg-[#FBFDFF]">
          <header className="sticky top-0 z-40 flex min-h-[88px] shrink-0 items-center gap-4 border-b border-[#E8ECF4] bg-white/92 px-5 backdrop-blur md:px-12">
            <SidebarTrigger className="h-10 w-10 rounded-full border border-[#E8ECF4] bg-white text-[#10204A] shadow-sm hover:bg-[#ECFBFA] hover:text-[#08AAA7] md:hidden" />
            <Link
              to="/hub"
              className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08AAA7] focus-visible:ring-offset-2"
            >
              <img
                src="/primkeet-logo.png"
                alt="PrimKeet"
                width={176}
                height={60}
                className="h-10 w-auto object-contain"
              />
            </Link>
            <nav className="hidden items-center gap-2 md:flex" aria-label="Primary navigation">
              <Link
                to="/hub"
                activeOptions={{ exact: true }}
                activeProps={{ className: "rounded-full bg-[#FFF0F6] px-5 py-2.5 text-sm font-extrabold text-[#FF3B8D]" }}
                inactiveProps={{ className: "rounded-full px-4 py-2.5 text-sm font-extrabold text-[#52617E] transition hover:bg-[#F6F8FC]" }}
              >
                Library
              </Link>
              <Link
                to="/hub/academy"
                activeProps={{ className: "rounded-full bg-[#FFF0F6] px-5 py-2.5 text-sm font-extrabold text-[#FF3B8D]" }}
                inactiveProps={{ className: "rounded-full px-4 py-2.5 text-sm font-extrabold text-[#52617E] transition hover:bg-[#F6F8FC]" }}
              >
                Academy
              </Link>
              <Link
                to="/hub/leaderboard"
                activeProps={{ className: "rounded-full bg-[#FFF0F6] px-5 py-2.5 text-sm font-extrabold text-[#FF3B8D]" }}
                inactiveProps={{ className: "rounded-full px-4 py-2.5 text-sm font-extrabold text-[#52617E] transition hover:bg-[#F6F8FC]" }}
              >
                Leaderboard
              </Link>
              <Link
                to="/hub/profile"
                activeProps={{ className: "rounded-full bg-[#FFF0F6] px-5 py-2.5 text-sm font-extrabold text-[#FF3B8D]" }}
                inactiveProps={{ className: "rounded-full px-4 py-2.5 text-sm font-extrabold text-[#52617E] transition hover:bg-[#F6F8FC]" }}
              >
                Profile
              </Link>
            </nav>
            <div className="relative ml-auto hidden w-full max-w-[300px] xl:block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8190AA]" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search games"
                className="h-12 rounded-full border-[#D7DEEA] bg-white pl-12 font-semibold text-[#10204A] shadow-none focus-visible:ring-[#08AAA7]"
              />
            </div>
            <Link
              to="/hub/profile"
              aria-label="Profile"
              className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-[#E8F8F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08AAA7] focus-visible:ring-offset-2"
            >
              <AvatarPreview config={avatarConfig} size={40} />
            </Link>
          </header>
          <main className="flex-1">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
