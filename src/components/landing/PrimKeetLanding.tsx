import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Backpack,
  BarChart3,
  BookOpen,
  ChevronRight,
  ClipboardList,
  Flame,
  Gamepad2,
  Globe2,
  GraduationCap,
  Instagram,
  Languages,
  Menu,
  Mic,
  Music,
  Puzzle,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  UsersRound,
  Youtube,
  type LucideIcon,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getGlobalLeaderboard, type LeaderboardEntry } from "@/lib/scores.functions";
import { cn } from "@/lib/utils";

type RoutePath = "/auth" | "/hub" | "/hub/leaderboard";

type NavItem =
  | {
      label: string;
      icon: LucideIcon;
      to: RoutePath;
    }
  | {
      label: string;
      icon: LucideIcon;
      href: string;
    };

type MiniGame = {
  title: string;
  level: number;
  progress: number;
  icon: LucideIcon;
  iconClassName: string;
  artClassName: string;
  progressClassName: string;
};

type LandingStanding = {
  rank: number;
  userId: string;
  name: string;
  level: number;
  score: number;
};

const primaryButtonClass =
  "h-12 rounded-full bg-[#FF3B8D] px-7 text-base font-extrabold text-white shadow-[0_14px_30px_rgba(255,59,141,0.26)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#ec2f7e] hover:shadow-[0_18px_38px_rgba(255,59,141,0.3)] focus-visible:ring-2 focus-visible:ring-[#11BFC4] focus-visible:ring-offset-2 focus-visible:ring-offset-white";

const secondaryButtonClass =
  "h-12 rounded-full border-[#8B5CF6] bg-white px-7 text-base font-extrabold text-[#7C3AED] shadow-[0_10px_24px_rgba(139,92,246,0.12)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#F7F3FF] hover:text-[#6D28D9] focus-visible:ring-2 focus-visible:ring-[#11BFC4] focus-visible:ring-offset-2 focus-visible:ring-offset-white";

// TODO: Replace the anchor links with real routes when level and teacher pages are added.
const navItems: NavItem[] = [
  { label: "Games", icon: Gamepad2, to: "/hub" },
  { label: "Levels", icon: BarChart3, href: "#levels" },
  { label: "Leaderboards", icon: Trophy, to: "/hub/leaderboard" },
  { label: "Teachers", icon: UsersRound, href: "#teachers" },
];

const miniGames: MiniGame[] = [
  {
    title: "Word Adventure",
    level: 12,
    progress: 70,
    icon: Languages,
    iconClassName: "bg-[#11BFC4] text-white",
    artClassName: "bg-[linear-gradient(135deg,#DDFBFF,#E8FFF3)]",
    progressClassName: "bg-[linear-gradient(90deg,#4C8DFF,#11BFC4)]",
  },
  {
    title: "Speak Up!",
    level: 8,
    progress: 60,
    icon: Mic,
    iconClassName: "bg-[#8B5CF6] text-white",
    artClassName: "bg-[linear-gradient(135deg,#FFF3F8,#F7F3FF)]",
    progressClassName: "bg-[linear-gradient(90deg,#8B5CF6,#4C8DFF)]",
  },
  {
    title: "Read & Explore",
    level: 10,
    progress: 80,
    icon: BookOpen,
    iconClassName: "bg-[#FF981F] text-white",
    artClassName: "bg-[linear-gradient(135deg,#F2F8FF,#FFF6D8)]",
    progressClassName: "bg-[linear-gradient(90deg,#8B5CF6,#11BFC4)]",
  },
  {
    title: "Grammar Quest",
    level: 9,
    progress: 45,
    icon: Puzzle,
    iconClassName: "bg-[#FF3B8D] text-white",
    artClassName: "bg-[linear-gradient(135deg,#F7F3FF,#FFF4E8)]",
    progressClassName: "bg-[linear-gradient(90deg,#8B5CF6,#FF3B8D)]",
  },
];

const categoryCards = [
  {
    title: "Vocabulary Games",
    description: "Build words and boost your vocabulary through fun.",
    icon: Languages,
    bg: "bg-[#FFF3F8]",
    border: "border-[#FFC5DC]",
    iconWrap: "bg-[linear-gradient(135deg,#FF3B8D,#FF8AB9)]",
    text: "text-[#E11D73]",
  },
  {
    title: "Speaking Practice",
    description: "Talk, record, and improve your pronunciation.",
    icon: Mic,
    bg: "bg-[#FFF7E9]",
    border: "border-[#FFD89F]",
    iconWrap: "bg-[linear-gradient(135deg,#FF981F,#FFD43B)]",
    text: "text-[#E56F00]",
  },
  {
    title: "Reading Challenges",
    description: "Read stories and answer questions to level up.",
    icon: BookOpen,
    bg: "bg-[#ECFDFF]",
    border: "border-[#B7F2F5]",
    iconWrap: "bg-[linear-gradient(135deg,#11BFC4,#4C8DFF)]",
    text: "text-[#0B9297]",
  },
  {
    title: "Grammar Missions",
    description: "Complete missions and master grammar step by step.",
    icon: Puzzle,
    bg: "bg-[#F7F3FF]",
    border: "border-[#DBC9FF]",
    iconWrap: "bg-[linear-gradient(135deg,#8B5CF6,#B68CFF)]",
    text: "text-[#7C3AED]",
  },
];

const howItWorksSteps = [
  {
    title: "Choose a game",
    description: "Pick a game you like and start learning.",
    icon: Gamepad2,
    color: "bg-[#FF3B8D]",
    panel: "bg-[#FFF3F8]",
  },
  {
    title: "Practice English",
    description: "Play, speak, read, and answer challenges.",
    icon: Mic,
    color: "bg-[#FF981F]",
    panel: "bg-[#FFF7E9]",
  },
  {
    title: "Earn points",
    description: "Collect stars, badges, and rewards.",
    icon: Star,
    color: "bg-[#11BFC4]",
    panel: "bg-[#ECFDFF]",
  },
  {
    title: "Climb the leaderboard",
    description: "Compete with friends and become number one.",
    icon: Trophy,
    color: "bg-[#8B5CF6]",
    panel: "bg-[#F7F3FF]",
  },
];

const teacherBenefits = [
  { label: "Classroom reports", icon: ClipboardList, bg: "bg-[#EDF3FF]", color: "text-[#4C8DFF]" },
  {
    label: "Student progress tracking",
    icon: BarChart3,
    bg: "bg-[#FFF4E8]",
    color: "text-[#FF981F]",
  },
  {
    label: "Safe and ad-free learning",
    icon: ShieldCheck,
    bg: "bg-[#EFFFF7]",
    color: "text-[#11A66B]",
  },
  { label: "Aligned with ESL goals", icon: Puzzle, bg: "bg-[#F7F3FF]", color: "text-[#8B5CF6]" },
];

const footerLinks = [
  { label: "About", href: "#about" },
  { label: "Blog", href: "#blog" },
  { label: "Help Center", href: "#help-center" },
  { label: "Privacy", href: "#privacy" },
  { label: "Terms", href: "#terms" },
];

const socialLinks = [
  { label: "PrimKeet community", icon: Globe2 },
  { label: "PrimKeet Instagram", icon: Instagram },
  { label: "PrimKeet YouTube", icon: Youtube },
  { label: "PrimKeet music", icon: Music },
];

export function PrimKeetLanding() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FFFDFB] text-[#10204A]">
      <LandingMotionStyles />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[470px] bg-[linear-gradient(105deg,#FFF3F8_0%,#FFFDFB_42%,#F2F8FF_100%)]" />
      <div className="pointer-events-none absolute left-0 top-[300px] h-32 w-56 rounded-r-full bg-[#DDF7E8]" />
      <div className="pointer-events-none absolute right-0 top-[330px] h-32 w-64 rounded-l-full bg-[#DFF2FF]" />

      <div className="relative z-10">
        <PrimKeetNavbar />
        <main>
          <HeroSection />
          <GameCategoryGrid />
          <section className="mx-auto grid w-full max-w-[1500px] gap-5 px-5 pb-6 md:px-10 lg:grid-cols-[1.08fr_0.92fr]">
            <HowItWorks />
            <LeaderboardPreview />
          </section>
          <TeacherBanner />
        </main>
        <PrimKeetFooter />
      </div>
    </div>
  );
}

function PrimKeetNavbar() {
  return (
    <header className="mx-auto flex w-full max-w-[1780px] px-4 pt-5 md:px-8">
      <nav
        aria-label="Primary"
        className="pk-reveal flex min-h-[84px] w-full items-center justify-between gap-4 rounded-2xl border border-white/80 bg-white/[0.92] px-4 shadow-[0_18px_50px_rgba(49,64,106,0.12)] backdrop-blur md:px-8"
      >
        <Link
          to="/"
          className="flex shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#11BFC4] focus-visible:ring-offset-4"
        >
          <PrimKeetLogo className="h-12 w-auto sm:h-[58px]" />
        </Link>

        <div className="hidden items-center gap-5 lg:flex">
          {navItems.map((item) => (
            <NavItemLink key={item.label} item={item} />
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            asChild
            variant="outline"
            className="hidden h-12 rounded-full border-[#E7ECF5] bg-white px-6 font-extrabold text-[#10204A] shadow-[0_10px_24px_rgba(49,64,106,0.08)] hover:bg-[#F8FAFF] sm:inline-flex"
          >
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild className={cn(primaryButtonClass, "px-4 sm:px-6")}>
            <Link to="/hub">
              <span className="hidden sm:inline">Start playing</span>
              <span className="sm:hidden">Play</span>
              <Star className="fill-white" aria-hidden="true" />
            </Link>
          </Button>

          <details className="group relative lg:hidden">
            <summary className="grid h-12 w-12 cursor-pointer list-none place-items-center rounded-full border border-[#E7ECF5] bg-white text-[#10204A] shadow-[0_10px_24px_rgba(49,64,106,0.08)] transition hover:bg-[#F8FAFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#11BFC4]">
              <Menu className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Open navigation menu</span>
            </summary>
            <div className="absolute right-0 top-[calc(100%+12px)] z-30 w-64 rounded-lg border border-[#E7ECF5] bg-white p-2 shadow-[0_18px_44px_rgba(49,64,106,0.16)]">
              {navItems.map((item) => (
                <MobileNavItem key={item.label} item={item} />
              ))}
              <Link
                to="/auth"
                className="mt-1 flex min-h-11 items-center rounded-lg px-3 text-sm font-extrabold text-[#10204A] transition hover:bg-[#F8FAFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#11BFC4]"
              >
                Sign in
              </Link>
            </div>
          </details>
        </div>
      </nav>
    </header>
  );
}

function NavItemLink({ item }: { item: NavItem }) {
  const className =
    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold text-[#2F315F] transition hover:bg-[#F7F3FF] hover:text-[#6D28D9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#11BFC4]";
  const Icon = item.icon;

  if ("to" in item) {
    return (
      <Link to={item.to} className={className}>
        <Icon className="h-4 w-4 text-[#4A4375]" aria-hidden="true" />
        {item.label}
      </Link>
    );
  }

  return (
    <a href={item.href} className={className}>
      <Icon className="h-4 w-4 text-[#4A4375]" aria-hidden="true" />
      {item.label}
    </a>
  );
}

function MobileNavItem({ item }: { item: NavItem }) {
  const className =
    "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-extrabold text-[#10204A] transition hover:bg-[#F8FAFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#11BFC4]";
  const Icon = item.icon;

  if ("to" in item) {
    return (
      <Link to={item.to} className={className}>
        <Icon className="h-4 w-4 text-[#8B5CF6]" aria-hidden="true" />
        {item.label}
      </Link>
    );
  }

  return (
    <a href={item.href} className={className}>
      <Icon className="h-4 w-4 text-[#8B5CF6]" aria-hidden="true" />
      {item.label}
    </a>
  );
}

function HeroSection() {
  return (
    <section className="mx-auto grid w-full max-w-[1650px] items-center gap-10 px-5 pb-8 pt-12 md:px-10 md:pb-10 lg:grid-cols-[0.86fr_1.14fr] lg:gap-12 lg:pt-16">
      <div className="pk-reveal relative max-w-[680px]">
        <DecorativeMarks />
        <p className="mb-5 inline-flex rounded-full bg-[#ECFDFF] px-4 py-2 text-sm font-extrabold text-[#0B9297] shadow-[0_10px_24px_rgba(17,191,196,0.12)]">
          English practice made fun
        </p>
        <h1 className="text-[clamp(3.25rem,6.4vw,6.4rem)] font-black leading-[0.98] text-[#10204A]">
          Learn English
          <span className="block bg-[linear-gradient(105deg,#FF3B8D,#8B5CF6)] bg-clip-text text-transparent">
            through play.
          </span>
        </h1>
        <p className="mt-6 max-w-[560px] text-[clamp(1rem,1.5vw,1.28rem)] font-medium leading-8 text-[#667085]">
          Practice vocabulary, speaking, reading, and grammar with fun games made for ESL learners
          like you.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild className={primaryButtonClass}>
            <Link to="/hub">
              Play now
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="outline" className={secondaryButtonClass}>
            <Link to="/hub">
              Explore games
              <Gamepad2 aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="pk-reveal pk-delay-1">
        <StudentDashboardPreview />
      </div>
    </section>
  );
}

function DecorativeMarks() {
  return (
    <div aria-hidden="true" className="pointer-events-none">
      <Sparkles className="absolute -right-8 top-24 hidden h-10 w-10 fill-[#FFD43B] text-[#FFD43B] md:block" />
      <span className="absolute -left-5 top-20 h-3 w-10 rotate-12 rounded-full bg-[#11BFC4]" />
      <span className="absolute -left-7 top-8 h-2 w-8 rotate-[38deg] rounded-full bg-[#11BFC4]" />
      <span className="absolute right-24 top-10 h-3 w-3 rounded-full bg-[#FFD43B]" />
      <span className="absolute -bottom-8 left-32 h-2 w-2 rounded-full bg-[#FF981F]" />
    </div>
  );
}

function StudentDashboardPreview() {
  return (
    <Card className="relative overflow-hidden rounded-lg border-white/80 bg-white/[0.88] p-4 text-[#10204A] shadow-[0_24px_70px_rgba(76,141,255,0.2)] backdrop-blur sm:p-5 lg:p-7">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(140deg,#F2F8FF_0%,#FFFFFF_45%,#FFF3F8_100%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="absolute -right-10 top-24 h-24 w-44 rounded-full bg-white/70" />
        <span className="absolute right-6 top-20 h-16 w-32 rounded-full bg-white/80" />
        <span className="absolute left-8 top-6 h-10 w-20 rounded-full bg-white/60" />
        <Sparkles className="absolute right-40 top-24 h-4 w-4 fill-[#FFD43B] text-[#FFD43B]" />
      </div>
      <div className="relative">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black leading-tight text-[#10204A]">
                Welcome back, Alex!
              </h2>
              <Sparkles className="h-5 w-5 fill-[#FFD43B] text-[#FFD43B]" aria-hidden="true" />
            </div>
            <p className="mt-1 text-sm font-semibold text-[#667085]">
              Let&apos;s keep building your English superpowers!
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <SummaryTile icon={Flame} value="7" label="Day streak" color="text-[#FF981F]" />
            <SummaryTile icon={Star} value="2,450" label="Points" color="text-[#FFD43B]" />
            <Avatar className="h-16 w-16 border-4 border-white bg-[#FFEAF3] shadow-[0_10px_28px_rgba(49,64,106,0.14)]">
              <AvatarFallback className="bg-[linear-gradient(135deg,#FFE0EF,#DDFBFF)] text-xl font-black text-[#10204A]">
                A
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_180px]">
          <div className="rounded-lg bg-white/[0.68] p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.9)] sm:p-4">
            <h3 className="mb-4 text-sm font-black text-[#10204A]">Continue playing</h3>
            <div className="grid grid-cols-2 gap-3 min-[580px]:grid-cols-4">
              {miniGames.map((game) => (
                <MiniGameCard key={game.title} game={game} />
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <DailyGoalCard />
            <ChallengeCard />
          </div>
        </div>
      </div>
      <ParakeetMascot className="pk-float absolute right-1 top-[126px] hidden h-28 w-28 xl:block" />
    </Card>
  );
}

function SummaryTile({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <div className="grid min-h-[68px] min-w-0 place-items-center rounded-lg border border-[#E8F0FF] bg-white/[0.82] px-3 py-2 text-center shadow-[0_10px_24px_rgba(49,64,106,0.08)]">
      <div className="flex items-center justify-center gap-1">
        <Icon className={cn("h-6 w-6", color)} aria-hidden="true" />
        <span className="font-black text-[#10204A]">{value}</span>
      </div>
      <span className="text-[0.68rem] font-bold text-[#667085]">{label}</span>
    </div>
  );
}

function MiniGameCard({ game }: { game: MiniGame }) {
  const Icon = game.icon;

  return (
    <article className="group overflow-hidden rounded-lg border border-[#E8F0FF] bg-white shadow-[0_12px_28px_rgba(49,64,106,0.1)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(49,64,106,0.16)]">
      <div className={cn("relative aspect-[1.18] overflow-hidden p-3", game.artClassName)}>
        <span
          className="absolute left-3 top-3 h-3 w-3 rounded-full bg-white/75"
          aria-hidden="true"
        />
        <span
          className="absolute bottom-4 right-4 h-8 w-8 rounded-lg bg-white/[0.65]"
          aria-hidden="true"
        />
        <div
          className={cn(
            "absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full shadow-[0_12px_22px_rgba(49,64,106,0.14)] transition duration-300 group-hover:scale-105",
            game.iconClassName,
          )}
        >
          <Icon className="h-8 w-8" aria-hidden="true" />
        </div>
      </div>
      <div className="p-3">
        <h4 className="text-sm font-black leading-tight text-[#10204A]">{game.title}</h4>
        <div className="mt-3 flex items-center justify-between gap-2 text-[0.68rem] font-bold text-[#667085]">
          <span>Level {game.level}</span>
          <span>{game.progress}%</span>
        </div>
        <div className="pk-progress mt-1 h-1.5 overflow-hidden rounded-full bg-[#E8EDF6]">
          <span
            className={cn("block h-full rounded-full", game.progressClassName)}
            style={{ width: `${game.progress}%` }}
          />
        </div>
      </div>
    </article>
  );
}

function DailyGoalCard() {
  return (
    <aside className="rounded-lg border border-[#E8F0FF] bg-white p-4 shadow-[0_12px_28px_rgba(49,64,106,0.1)]">
      <p className="text-xs font-black text-[#10204A]">Daily Goal</p>
      <div className="mt-3 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-[#FFF6D8] text-[#F5A400]">
          <Star className="h-7 w-7 fill-[#FFD43B]" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xl font-black text-[#10204A]">3/5</p>
          <p className="text-xs font-bold text-[#667085]">games played</p>
        </div>
      </div>
      <div className="pk-progress mt-3 h-2 overflow-hidden rounded-full bg-[#E8EDF6]">
        <span className="block h-full w-[60%] rounded-full bg-[linear-gradient(90deg,#4C8DFF,#11BFC4)]" />
      </div>
      <p className="mt-2 text-center text-[0.68rem] font-bold text-[#667085]">Great job!</p>
    </aside>
  );
}

function ChallengeCard() {
  return (
    <aside className="relative overflow-hidden rounded-lg border border-[#E8F0FF] bg-white p-4 shadow-[0_12px_28px_rgba(49,64,106,0.1)]">
      <Sparkles
        className="absolute right-3 top-3 h-4 w-4 fill-[#8B5CF6] text-[#8B5CF6]"
        aria-hidden="true"
      />
      <p className="text-xs font-black text-[#10204A]">New Challenge!</p>
      <p className="mt-1 text-sm font-extrabold text-[#2F315F]">Prepositions</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <Button
          asChild
          className="h-9 rounded-full bg-[#FFF3F8] px-4 text-xs font-black text-[#FF3B8D] shadow-none hover:bg-[#FFE4F0]"
        >
          <Link to="/hub">Play now</Link>
        </Button>
        <div className="grid h-12 w-14 place-items-center rounded-lg bg-[linear-gradient(135deg,#EFFFF7,#FFF4E8)]">
          <ScrollText className="h-7 w-7 text-[#FF981F]" aria-hidden="true" />
        </div>
      </div>
    </aside>
  );
}

function GameCategoryGrid() {
  return (
    <section
      id="levels"
      aria-labelledby="game-categories-title"
      className="mx-auto w-full max-w-[1500px] px-5 pb-6 md:px-10"
    >
      <h2 id="game-categories-title" className="sr-only">
        Game categories
      </h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {categoryCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.title}
              className={cn(
                "pk-reveal group grid min-h-[126px] grid-cols-[88px_minmax(0,1fr)_44px] items-center gap-4 rounded-lg p-5 text-[#10204A] shadow-[0_12px_30px_rgba(49,64,106,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_38px_rgba(49,64,106,0.12)]",
                card.bg,
                card.border,
              )}
              style={{ animationDelay: `${120 + index * 70}ms` }}
            >
              <div
                className={cn(
                  "grid h-20 w-20 place-items-center rounded-lg text-white shadow-[0_12px_24px_rgba(49,64,106,0.14)]",
                  card.iconWrap,
                )}
              >
                <Icon className="h-10 w-10" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 className={cn("text-base font-black leading-tight", card.text)}>
                  {card.title}
                </h3>
                <p className="mt-1 text-sm font-semibold leading-5 text-[#667085]">
                  {card.description}
                </p>
              </div>
              <Link
                to="/hub"
                aria-label={`Open ${card.title}`}
                className={cn(
                  "grid h-11 w-11 place-items-center rounded-full text-white shadow-[0_10px_20px_rgba(49,64,106,0.12)] transition duration-300 group-hover:translate-x-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#11BFC4]",
                  card.iconWrap,
                )}
              >
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <Card className="pk-reveal rounded-lg border-[#E9EEF8] bg-white/[0.92] p-5 text-[#10204A] shadow-[0_12px_34px_rgba(49,64,106,0.08)] sm:p-6">
      <div className="mb-6 flex items-center justify-center gap-3 text-center">
        <Sparkles className="h-5 w-5 fill-[#11BFC4] text-[#11BFC4]" aria-hidden="true" />
        <h2 className="text-2xl font-black">How it works</h2>
        <Sparkles className="h-5 w-5 fill-[#11BFC4] text-[#11BFC4]" aria-hidden="true" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {howItWorksSteps.map((step, index) => {
          const Icon = step.icon;
          return (
            <article key={step.title} className="relative">
              <div className={cn("h-full rounded-lg p-4", step.panel)}>
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "grid h-11 w-11 place-items-center rounded-full text-lg font-black text-white shadow-[0_10px_20px_rgba(49,64,106,0.12)]",
                      step.color,
                    )}
                  >
                    {index + 1}
                  </div>
                  <div className="grid h-12 w-12 place-items-center rounded-lg bg-white text-[#10204A] shadow-[0_10px_20px_rgba(49,64,106,0.08)]">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                </div>
                <h3 className="mt-4 text-sm font-black text-[#10204A]">{step.title}</h3>
                <p className="mt-1 text-sm font-semibold leading-5 text-[#667085]">
                  {step.description}
                </p>
              </div>
              {index < howItWorksSteps.length - 1 ? (
                <ChevronRight
                  className="absolute -right-5 top-1/2 hidden h-6 w-6 -translate-y-1/2 text-[#90D4E8] xl:block"
                  aria-hidden="true"
                />
              ) : null}
            </article>
          );
        })}
      </div>
    </Card>
  );
}

function LeaderboardPreview() {
  const {
    data = [],
    isError,
    isLoading,
  } = useQuery({
    queryKey: ["landing-global-leaderboard"],
    queryFn: () => getGlobalLeaderboard(),
    enabled: typeof window !== "undefined",
    staleTime: 60_000,
  });
  const rows = buildLandingStandings(data).slice(0, 5);

  return (
    <Card className="pk-reveal pk-delay-1 relative overflow-hidden rounded-lg border-[#E9EEF8] bg-white/[0.92] p-5 text-[#10204A] shadow-[0_12px_34px_rgba(49,64,106,0.08)] sm:p-6">
      <div className="pointer-events-none absolute right-3 top-7 hidden h-44 w-48 sm:block">
        <TrophyIllustration />
      </div>
      <div className="relative z-10 mb-4 flex items-center justify-between gap-4 pr-0 sm:pr-48">
        <h2 className="text-2xl font-black">Live Leaderboard</h2>
        <Link
          to="/hub/leaderboard"
          className="rounded-full px-3 py-2 text-sm font-black text-[#8B5CF6] transition hover:bg-[#F7F3FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#11BFC4]"
        >
          View all
        </Link>
      </div>

      <div className="relative z-10 sm:pr-44">
        {isLoading ? (
          <LeaderboardSkeleton />
        ) : isError ? (
          <LeaderboardEmptyState message="Leaderboard data is warming up." />
        ) : rows.length === 0 ? (
          <LeaderboardEmptyState message="No ranked players yet. Scores will appear after games are played." />
        ) : (
          <div className="space-y-2">
            {rows.map((row, index) => (
              <LeaderboardRow key={row.userId} row={row} highlighted={index === 2} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function LeaderboardRow({ row, highlighted }: { row: LandingStanding; highlighted: boolean }) {
  const rankClass =
    row.rank === 1
      ? "bg-[#FFF2B8] text-[#A86200]"
      : row.rank === 2
        ? "bg-[#EEF1F6] text-[#667085]"
        : row.rank === 3
          ? "bg-[#FFE7D9] text-[#B44D1A]"
          : "bg-white text-[#FF981F]";

  return (
    <div
      className={cn(
        "grid min-h-[52px] grid-cols-[38px_minmax(0,1fr)_92px] items-center gap-3 rounded-lg border border-transparent px-3 py-2 transition",
        highlighted ? "border-[#B7F2F5] bg-[#ECFDFF]" : "bg-white/[0.76]",
      )}
    >
      <div
        className={cn("grid h-8 w-8 place-items-center rounded-full text-sm font-black", rankClass)}
      >
        {row.rank}
      </div>
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="h-9 w-9 border-2 border-white bg-[#F7F3FF]">
          <AvatarFallback className="bg-[linear-gradient(135deg,#FFF3F8,#DDFBFF)] text-xs font-black text-[#10204A]">
            {getInitials(row.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-[#10204A]">{row.name}</p>
          <p className="text-xs font-bold text-[#667085]">Level {row.level}</p>
        </div>
      </div>
      <div className="flex items-center justify-end gap-1 text-sm font-black text-[#2F315F]">
        <Star className="h-4 w-4 fill-[#FFD43B] text-[#F5A400]" aria-hidden="true" />
        {formatPoints(row.score)}
      </div>
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-2" aria-label="Loading leaderboard">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="min-h-[52px] animate-pulse rounded-lg bg-[#F4F7FC]" />
      ))}
    </div>
  );
}

function LeaderboardEmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[#CDE8EF] bg-[#F8FCFF] px-4 py-8 text-center">
      <Trophy className="mx-auto h-8 w-8 text-[#11BFC4]" aria-hidden="true" />
      <p className="mx-auto mt-3 max-w-sm text-sm font-bold leading-6 text-[#667085]">{message}</p>
    </div>
  );
}

function TeacherBanner() {
  return (
    <section id="teachers" className="mx-auto w-full max-w-[1500px] px-5 pb-8 md:px-10">
      <Card className="pk-reveal grid gap-6 overflow-hidden rounded-lg border-[#F3DFD4] bg-[linear-gradient(105deg,#FFFDFB,#FFF7F0_52%,#F7F3FF)] p-6 text-[#10204A] shadow-[0_12px_34px_rgba(49,64,106,0.08)] lg:grid-cols-[210px_minmax(0,1fr)_250px] lg:items-center">
        <ClassroomVisual />
        <div>
          <h2 className="text-2xl font-black">Loved by teachers. Built for classrooms.</h2>
          <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-[#667085]">
            PrimKeet makes it easy to engage students, track progress, and bring fun into English
            learning.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {teacherBenefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div key={benefit.label} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "grid h-11 w-11 shrink-0 place-items-center rounded-lg",
                      benefit.bg,
                    )}
                  >
                    <Icon className={cn("h-5 w-5", benefit.color)} aria-hidden="true" />
                  </span>
                  <span className="text-sm font-extrabold leading-5 text-[#2F315F]">
                    {benefit.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <Button
          asChild
          className="h-12 rounded-full bg-[#8B5CF6] px-6 text-base font-black text-white shadow-[0_14px_30px_rgba(139,92,246,0.26)] transition hover:-translate-y-0.5 hover:bg-[#7C3AED] focus-visible:ring-2 focus-visible:ring-[#11BFC4] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          <a href="#teachers">
            Teachers, learn more
            <ArrowRight aria-hidden="true" />
          </a>
        </Button>
      </Card>
    </section>
  );
}

function PrimKeetFooter() {
  return (
    <footer className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-5 pb-8 text-[#667085] md:px-10 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-4">
        <PrimKeetLogo className="h-9 w-auto" />
        <p className="text-sm font-semibold">&copy; 2026 PrimKeet. All rights reserved.</p>
      </div>
      <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-3">
        {/* TODO: Point these to real static pages when they are implemented. */}
        {footerLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="rounded-full text-sm font-bold transition hover:text-[#8B5CF6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#11BFC4]"
          >
            {link.label}
          </a>
        ))}
      </nav>
      <div className="flex items-center gap-3">
        {socialLinks.map((social) => {
          const Icon = social.icon;
          return (
            <a
              key={social.label}
              href="#social"
              aria-label={social.label}
              className="grid h-9 w-9 place-items-center rounded-full bg-[#EEF2F8] text-[#667085] transition hover:bg-[#F7F3FF] hover:text-[#8B5CF6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#11BFC4]"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </a>
          );
        })}
      </div>
    </footer>
  );
}

function PrimKeetLogo({ className }: { className?: string }) {
  return (
    <img
      src="/primkeet-logo.png"
      alt="PrimKeet"
      width={176}
      height={60}
      className={cn("object-contain", className)}
    />
  );
}

function ClassroomVisual() {
  return (
    <div aria-hidden="true" className="relative h-32 min-w-[180px]">
      <div className="absolute bottom-3 left-4 h-24 w-20 rotate-[-8deg] rounded-lg bg-[linear-gradient(145deg,#4C8DFF,#11BFC4)] shadow-[0_18px_30px_rgba(76,141,255,0.2)]" />
      <div className="absolute bottom-1 left-0 h-9 w-28 rounded-lg bg-[#FF981F] shadow-[0_12px_22px_rgba(255,152,31,0.18)]" />
      <div className="absolute bottom-12 left-14 grid h-16 w-16 place-items-center rounded-lg bg-[#FFF3F8] shadow-[0_12px_24px_rgba(49,64,106,0.12)]">
        <Backpack className="h-10 w-10 text-[#FF3B8D]" />
      </div>
      <div className="absolute bottom-4 left-28 grid h-16 w-16 rotate-6 place-items-center rounded-lg bg-white shadow-[0_12px_24px_rgba(49,64,106,0.12)]">
        <GraduationCap className="h-9 w-9 text-[#8B5CF6]" />
      </div>
    </div>
  );
}

function TrophyIllustration() {
  return (
    <div className="relative h-full w-full">
      <Sparkles
        className="absolute left-4 top-4 h-5 w-5 fill-[#8B5CF6] text-[#8B5CF6]"
        aria-hidden="true"
      />
      <Sparkles
        className="absolute right-8 top-0 h-6 w-6 fill-[#FFD43B] text-[#FFD43B]"
        aria-hidden="true"
      />
      <div className="absolute bottom-0 left-1/2 h-8 w-40 -translate-x-1/2 rounded-full bg-[#E8E0FF]" />
      <div className="absolute bottom-7 left-8 h-14 w-16 rounded-lg bg-[#8B5CF6]" />
      <div className="absolute bottom-7 left-[78px] h-24 w-16 rounded-lg bg-[#11BFC4]" />
      <div className="absolute bottom-7 right-8 h-16 w-16 rounded-lg bg-[#FF3B8D]" />
      <div className="absolute bottom-[98px] left-[64px] grid h-20 w-24 place-items-center rounded-b-lg rounded-t-full bg-[linear-gradient(145deg,#FFD43B,#FF981F)] shadow-[0_16px_28px_rgba(255,152,31,0.24)]">
        <Trophy className="h-12 w-12 text-white" aria-hidden="true" />
      </div>
    </div>
  );
}

function ParakeetMascot({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="parakeetBody" x1="24" x2="88" y1="22" y2="94">
          <stop stopColor="#11BFC4" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id="parakeetWing" x1="62" x2="102" y1="42" y2="90">
          <stop stopColor="#FF3B8D" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <path
        d="M61 14c19 7 31 26 30 47-2 25-19 43-41 42-17-1-31-15-32-33C16 42 35 22 61 14z"
        fill="url(#parakeetBody)"
      />
      <path d="M72 47c18 4 30 17 31 35-14 2-29-3-39-14 0-8 3-15 8-21z" fill="url(#parakeetWing)" />
      <path d="M39 16c9-10 20-11 27-6-9 2-15 8-18 18z" fill="#FF3B8D" />
      <path d="M84 30l20 8-19 9c1-6 1-11-1-17z" fill="#FF981F" />
      <circle cx="69" cy="33" r="6" fill="#fff" />
      <circle cx="71" cy="33" r="3" fill="#10204A" />
      <path d="M39 101c-5 7-11 9-18 7 7-7 13-12 20-15z" fill="#8B5CF6" />
      <path d="M48 103c-3 9-8 13-16 13 4-8 9-15 15-20z" fill="#4C8DFF" />
      <path
        d="M48 78c8 6 19 6 28-1"
        fill="none"
        stroke="#fff"
        strokeLinecap="round"
        strokeWidth="5"
      />
    </svg>
  );
}

function buildLandingStandings(rows: LeaderboardEntry[]): LandingStanding[] {
  const totals = new Map<string, { name: string; score: number }>();

  for (const row of rows) {
    const current = totals.get(row.user_id);
    const name = row.username?.trim() || "Anonymous player";
    if (!current) {
      totals.set(row.user_id, { name, score: row.score });
      continue;
    }
    current.score += row.score;
  }

  return Array.from(totals.entries())
    .map(([userId, value]) => ({
      userId,
      name: value.name,
      score: value.score,
      level: Math.max(1, Math.min(99, Math.round(value.score / 250))),
    }))
    .sort((a, b) => b.score - a.score)
    .map((standing, index) => ({ ...standing, rank: index + 1 }));
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatPoints(points: number) {
  return points.toLocaleString("en-US");
}

function LandingMotionStyles() {
  return (
    <style>
      {`
        @keyframes pk-fade-up {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pk-float {
          0%, 100% {
            transform: translateY(0) rotate(-2deg);
          }
          50% {
            transform: translateY(-10px) rotate(2deg);
          }
        }

        @keyframes pk-progress-grow {
          from {
            transform: scaleX(0);
          }
          to {
            transform: scaleX(1);
          }
        }

        .pk-reveal {
          animation: pk-fade-up 620ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }

        .pk-delay-1 {
          animation-delay: 120ms;
        }

        .pk-float {
          animation: pk-float 4.6s ease-in-out infinite;
        }

        .pk-progress > span {
          transform-origin: left center;
          animation: pk-progress-grow 780ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }

        @media (prefers-reduced-motion: reduce) {
          .pk-reveal,
          .pk-float,
          .pk-progress > span {
            animation: none;
          }
        }
      `}
    </style>
  );
}
