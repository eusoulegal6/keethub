import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Gamepad2,
  LayoutGrid,
  Trophy,
  User as UserIcon,
  LogOut,
} from "lucide-react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

const navItems = [
  { title: "Library", url: "/hub", icon: LayoutGrid, exact: true },
  { title: "Leaderboard", url: "/hub/leaderboard", icon: Trophy, exact: false },
  { title: "Profile", url: "/hub/profile", icon: UserIcon, exact: false },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const initial = user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          to="/hub"
          className="flex items-center gap-2 px-2 py-1.5 font-bold"
        >
          <span className="grid place-items-center w-7 h-7 rounded-md bg-primary text-primary-foreground shrink-0">
            <Gamepad2 className="w-4 h-4" />
          </span>
          <span className="group-data-[collapsible=icon]:hidden">GameHub</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const active = item.exact
                  ? pathname === item.url
                  : pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="w-4 h-4" />
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

      <SidebarFooter>
        <div className="flex items-center gap-2 p-2 rounded-lg group-data-[collapsible=icon]:justify-center">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-medium truncate">
              {user?.email ?? "Player"}
            </p>
            <p className="text-xs text-muted-foreground">Signed in</p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="w-7 h-7 group-data-[collapsible=icon]:hidden"
            onClick={async () => {
              await queryClient.cancelQueries();
              queryClient.clear();
              await signOut();
              navigate({ to: "/auth", replace: true });
            }}
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
