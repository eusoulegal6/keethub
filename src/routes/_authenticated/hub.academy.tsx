import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/hub/academy")({
  ssr: false,
  component: AcademyLayout,
});

function AcademyLayout() {
  return <Outlet />;
}
