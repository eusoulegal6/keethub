import { createFileRoute } from "@tanstack/react-router";
import { UnitPath } from "@/games/academy/components/UnitPath";

export const Route = createFileRoute("/_authenticated/hub/academy/")({
  ssr: false,
  component: AcademyIndexPage,
});

function AcademyIndexPage() {
  return <UnitPath />;
}
