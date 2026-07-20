import { useEffect } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutGrid, GraduationCap, Trophy, User as UserIcon, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AvatarPreview } from "@/components/avatar/AvatarPreview";
import { useProfileStore } from "@/stores/profile-store";

const navItems = [
  { title: "Library", url: "/hub", icon: LayoutGrid, exact: true },
  { title: "Academy", url: "/hub/academy", icon: GraduationCap, exact: false },
  { title: "Leaderboard", url: "/hub/leaderboard", icon: Trophy, exact: false },
  { title: "Profile", url: "/hub/profile", icon: UserIcon, exact: false },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { avatarConfig, isLoaded, loadProfile } = useProfileStore();

  useEffect(() => {
    if (user?.id && !isLoaded) {
      loadProfile(user.id);
    }
  }, [user?.id, isLoaded, loadProfile]);

  return (
    <Sidebar collapsible="icon" className="border-r border-[#E8ECF4]">
      <SidebarHeader className="border-b border-[#E8ECF4] px-3 py-4">
        <Link
          to="/hub"
          className="flex min-h-12 items-center rounded-lg px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08AAA7] focus-visible:ring-offset-2"
        >
          <img
            src="/primkeet-logo.png"
            alt="PrimKeet"
            width={176}
            height={60}
            className="h-10 w-auto max-w-[150px] object-contain group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:max-w-8"
          />
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {navItems.map((item) => {
                const active = item.exact ? pathname === item.url : pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className="h-11 rounded-lg px-3 text-sm font-bold text-[#10204A] hover:bg-[#ECFBFA] hover:text-[#087E7D] data-[active=true]:bg-[#FFF1F6] data-[active=true]:text-[#FF3B8D] group-data-[collapsible=icon]:!h-10 group-data-[collapsible=icon]:!w-10"
                    >
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-[#E8ECF4] p-3">
        <Link
          to="/hub/profile"
          className="flex items-center gap-3 rounded-lg border border-[#E8ECF4] bg-white p-2 shadow-[0_10px_24px_rgba(16,32,74,0.05)] transition-colors hover:bg-[#F7F1FF] group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:shadow-none"
        >
          <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full border-2 border-white shadow-sm">
            <AvatarPreview config={avatarConfig} size={32} />
          </div>
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-bold text-[#10204A]">{user?.email ?? "Player"}</p>
            <p className="text-xs font-medium text-[#667085]">Signed in</p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full text-[#667085] hover:bg-[#FFF1F6] hover:text-[#FF3B8D] group-data-[collapsible=icon]:hidden"
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              await queryClient.cancelQueries();
              queryClient.clear();
              await signOut();
              navigate({ to: "/auth", replace: true });
            }}
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
