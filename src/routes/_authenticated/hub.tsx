import { createFileRoute, Outlet } from "@tanstack/react-router";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export const Route = createFileRoute("/_authenticated/hub")({
  component: HubLayout,
});

function HubLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-border/60 px-4 gap-3 sticky top-0 z-10 bg-background/80 backdrop-blur">
            <SidebarTrigger />
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
