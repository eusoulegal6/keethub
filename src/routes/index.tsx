import { createFileRoute, Link } from "@tanstack/react-router";
import { Gamepad2, Trophy, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GameHub — Play. Compete. Level up." },
      {
        name: "description",
        content:
          "Your home base for browser games. Jump between titles, track your scores, and climb the leaderboards.",
      },
      { property: "og:title", content: "GameHub — Play. Compete. Level up." },
      {
        property: "og:description",
        content:
          "Your home base for browser games. Jump between titles, track your scores, and climb the leaderboards.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 md:px-10">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
            <Gamepad2 className="w-5 h-5" />
          </span>
          <span>GameHub</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild>
            <Link to="/hub">Enter Hub</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 backdrop-blur px-3 py-1 text-xs text-muted-foreground mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Now with 6 launch titles
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl leading-[1.05]">
          One hub.
          <br />
          <span className="text-gradient-primary">Every game you play.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          A launcher for the modern browser. Jump between titles, save
          progress, and battle friends on shared leaderboards.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="glow-primary">
            <Link to="/auth">
              Get started
              <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/hub">Browse games</Link>
          </Button>
        </div>

        <div className="mt-24 grid md:grid-cols-3 gap-4 max-w-4xl w-full">
          {[
            {
              icon: Gamepad2,
              title: "Instant play",
              body: "No downloads. Every game runs right in your browser.",
            },
            {
              icon: Trophy,
              title: "Live leaderboards",
              body: "Every score is tracked and ranked across the community.",
            },
            {
              icon: Zap,
              title: "One profile",
              body: "One account, one avatar — across every title in the hub.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card/60 backdrop-blur p-6 text-left"
            >
              <f.icon className="w-6 h-6 text-primary" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} GameHub. All games belong to their
        respective creators.
      </footer>
    </div>
  );
}
