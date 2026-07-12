import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronDown, ChevronRight, Sparkles, Star, Trophy } from "lucide-react";
import { getGlobalLeaderboard, type LeaderboardEntry } from "@/lib/scores.functions";
import { getDiceBearAvatarUrlFromSeed } from "@/lib/avatar/dicebear/api";
import { useAuth } from "@/hooks/use-auth";

type DateRange = {
  label: string;
  note: string;
  days: number | null;
};

type PlayerStanding = {
  rank: number;
  userId: string;
  name: string;
  score: number;
  bestGameTitle: string;
  bestGameSlug: string;
  submissions: number;
  lastPlayedAt: string;
};

const leaderboardQuery = queryOptions({
  queryKey: ["global-leaderboard"],
  queryFn: () => getGlobalLeaderboard(),
});

const dateRanges: DateRange[] = [
  { label: "All time", note: "Every recorded score", days: null },
  { label: "Last 7 days", note: "Fresh weekly sprint", days: 7 },
  { label: "Last 30 days", note: "Recent momentum", days: 30 },
];

const winnerStyles = [
  {
    card: "border-[#ffd889] bg-[linear-gradient(145deg,#fff8df,#fff0bd)] shadow-[0_24px_58px_rgba(240,174,60,0.28)]",
    frame: "border-[#f7bf42] bg-[linear-gradient(145deg,#fff3bd,#fffaf0)]",
    medal: "border-[#e7a92d] bg-[linear-gradient(145deg,#fff2a8,#ffc94b)] text-[#9a5b00]",
    label: "border-[#f4bd46] bg-[#fff0ba] text-[#9a4e08]",
    copy: "Unstoppable!",
  },
  {
    card: "border-[#c9c8ff] bg-[linear-gradient(145deg,#f5f3ff,#eef5ff)] shadow-[0_18px_44px_rgba(143,134,226,0.22)]",
    frame: "border-[#c4c7ff] bg-[linear-gradient(145deg,#e9e9ff,#f4f8ff)]",
    medal: "border-[#b8bbff] bg-[linear-gradient(145deg,#f0efff,#d8dcff)] text-[#615fc6]",
    label: "border-[#bbb7ff] bg-[#ecebff] text-[#4e48c5]",
    copy: "Great effort!",
  },
  {
    card: "border-[#ffc1bb] bg-[linear-gradient(145deg,#fff4ed,#ffe8ee)] shadow-[0_18px_44px_rgba(242,146,156,0.2)]",
    frame: "border-[#ffb5af] bg-[linear-gradient(145deg,#ffe7df,#fff4f7)]",
    medal: "border-[#ffb09b] bg-[linear-gradient(145deg,#ffd6be,#ff9f7b)] text-[#9c4523]",
    label: "border-[#ffb2b9] bg-[#ffe1e8] text-[#ba2f55]",
    copy: "Keep it up!",
  },
];

const rowAvatarClasses = [
  "bg-[#efe7ff]",
  "bg-[#f7eadf]",
  "bg-[#dff6ef]",
  "bg-[#e7f1ff]",
  "bg-[#f4e8ff]",
  "bg-[#eaf7dc]",
  "bg-[#ffe6ef]",
];

const confetti = [
  { left: "10%", top: "18%", color: "#ff9fc7", rotate: "-18deg" },
  { left: "24%", top: "7%", color: "#c69aff", rotate: "28deg" },
  { left: "50%", top: "16%", color: "#ffd35c", rotate: "12deg" },
  { left: "66%", top: "8%", color: "#ffb4d3", rotate: "-34deg" },
  { left: "80%", top: "18%", color: "#9ed8ff", rotate: "21deg" },
  { left: "93%", top: "9%", color: "#ffd56b", rotate: "-18deg" },
];

export const Route = createFileRoute("/_authenticated/hub/leaderboard")({
  head: () => ({
    meta: [
      { title: "Weekly Ranking — GameHub" },
      {
        name: "description",
        content: "Live player rankings across GameHub.",
      },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { user } = useAuth();
  const {
    data: rows = [],
    error,
    isError,
    isFetching,
    isLoading,
    status,
  } = useQuery(leaderboardQuery);
  const [selectedRangeIndex, setSelectedRangeIndex] = useState(0);
  const [rangeMenuOpen, setRangeMenuOpen] = useState(false);
  const [selectedRank, setSelectedRank] = useState(1);

  const selectedRange = dateRanges[selectedRangeIndex] ?? dateRanges[0];
  const standings = useMemo(() => buildStandings(rows, selectedRange), [rows, selectedRange]);
  const selectedStanding =
    standings.find((standing) => standing.rank === selectedRank) ?? standings[0] ?? null;
  const yourStanding = standings.find((standing) => standing.userId === user?.id) ?? null;
  const podium = standings.slice(0, 3);
  const tableRows = standings.slice(3, 10);

  useEffect(() => {
    const querySnapshot = {
      status,
      isLoading,
      isFetching,
      isError,
      errorMessage: error ? getErrorMessage(error) : null,
      rawRowCount: rows.length,
      rawRows: rows,
    };

    console.log("[Leaderboard] global leaderboard query", querySnapshot);

    if (error) {
      console.error("[Leaderboard] global leaderboard query failed", error);
    }
  }, [error, isError, isFetching, isLoading, rows, status]);

  useEffect(() => {
    console.log("[Leaderboard] derived profile standings", {
      selectedRange,
      selectedRangeIndex,
      loggedInUserId: user?.id ?? null,
      standingsCount: standings.length,
      standings,
      podium,
      tableRows,
      selectedStanding,
      yourStanding,
    });
  }, [
    podium,
    selectedRange,
    selectedRangeIndex,
    selectedStanding,
    standings,
    tableRows,
    user?.id,
    yourStanding,
  ]);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] overflow-hidden bg-[#fffaf6] text-[#201447]">
      <LeaderboardMotionStyles />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_10%,rgba(207,180,255,0.34),transparent_30%),radial-gradient(circle_at_88%_32%,rgba(255,188,219,0.28),transparent_24%),radial-gradient(circle_at_32%_96%,rgba(255,220,238,0.38),transparent_28%)]" />
      <main className="leaderboard-reveal relative mx-auto w-full max-w-[1120px] px-4 py-6 sm:px-6 lg:py-8">
        <section className="relative overflow-hidden rounded-[34px] border border-white/80 bg-white/55 px-5 py-6 shadow-[0_28px_80px_rgba(109,88,155,0.16)] backdrop-blur-xl sm:px-7 md:px-9">
          <DecorativeTrophy />
          <Header
            rangeMenuOpen={rangeMenuOpen}
            selectedRange={selectedRange}
            selectedRangeIndex={selectedRangeIndex}
            standingsCount={standings.length}
            yourStanding={yourStanding}
            onRangeMenuOpenChange={setRangeMenuOpen}
            onRangeSelect={(index) => {
              setSelectedRangeIndex(index);
              setRangeMenuOpen(false);
              setSelectedRank(1);
            }}
          />

          {isLoading ? (
            <LoadingState />
          ) : isError ? (
            <ErrorState error={error} />
          ) : standings.length === 0 ? (
            <EmptyState selectedRange={selectedRange} />
          ) : (
            <>
              <Podium standings={podium} />
              <LeaderboardTable
                rows={tableRows}
                selectedRange={selectedRange}
                selectedStanding={selectedStanding}
                onSelectRow={(rank) => setSelectedRank(rank)}
              />
            </>
          )}

          <FooterBanner selectedRange={selectedRange} />
        </section>
      </main>
    </div>
  );
}

function Header({
  rangeMenuOpen,
  selectedRange,
  selectedRangeIndex,
  standingsCount,
  yourStanding,
  onRangeMenuOpenChange,
  onRangeSelect,
}: {
  rangeMenuOpen: boolean;
  selectedRange: DateRange;
  selectedRangeIndex: number;
  standingsCount: number;
  yourStanding: PlayerStanding | null;
  onRangeMenuOpenChange: (open: boolean) => void;
  onRangeSelect: (index: number) => void;
}) {
  return (
    <header className="relative z-10 mb-8 grid gap-6 pr-0 md:mb-10 md:grid-cols-[minmax(0,1fr)_260px] md:pr-72">
      <div>
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/60 px-4 py-2 text-sm font-bold text-[#7254d4] shadow-[0_10px_24px_rgba(114,84,212,0.12)] backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-[#42d85b] shadow-[0_0_0_5px_rgba(66,216,91,0.18)]" />
          {standingsCount} ranked profiles loaded
        </div>
        <h1 className="text-5xl font-black leading-tight text-[#171042] sm:text-6xl">
          Weekly Ranking
        </h1>
        <p className="mt-2 text-xl font-medium text-[#625b92]">Compete, climb, and shine! ✨</p>
        <DateRangePicker
          open={rangeMenuOpen}
          selectedRange={selectedRange}
          selectedRangeIndex={selectedRangeIndex}
          onOpenChange={onRangeMenuOpenChange}
          onSelect={onRangeSelect}
        />
      </div>

      <YourStandingCard standing={yourStanding} />
    </header>
  );
}

function DateRangePicker({
  open,
  selectedRange,
  selectedRangeIndex,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  selectedRange: DateRange;
  selectedRangeIndex: number;
  onOpenChange: (open: boolean) => void;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="relative mt-7 inline-block">
      <button
        type="button"
        className="inline-flex items-center gap-3 rounded-[20px] border border-[#ded6fb] bg-white/78 px-6 py-3 text-lg font-semibold text-[#423d78] shadow-[0_12px_28px_rgba(108,93,170,0.14)] backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-[#bfaeff] hover:shadow-[0_16px_34px_rgba(108,93,170,0.18)]"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => onOpenChange(!open)}
      >
        <CalendarDays className="h-5 w-5 text-[#6f5ad8]" />
        <span>{selectedRange.label}</span>
        <ChevronDown
          className={`h-5 w-5 text-[#6f5ad8] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          className="leaderboard-pop absolute left-0 top-[calc(100%+10px)] z-40 w-[300px] rounded-[24px] border border-white/80 bg-white/90 p-2 shadow-[0_24px_54px_rgba(99,75,157,0.2)] backdrop-blur-xl"
          role="menu"
        >
          {dateRanges.map((range, index) => (
            <button
              key={range.label}
              type="button"
              className={`flex w-full items-center justify-between rounded-[18px] px-4 py-3 text-left transition ${
                index === selectedRangeIndex
                  ? "bg-[#f1ebff] text-[#6245d2]"
                  : "text-[#50497d] hover:bg-[#faf7ff]"
              }`}
              role="menuitem"
              onClick={() => onSelect(index)}
            >
              <span>
                <span className="block text-sm font-black">{range.label}</span>
                <span className="block text-xs font-semibold opacity-70">{range.note}</span>
              </span>
              {index === selectedRangeIndex ? (
                <Star className="h-5 w-5 fill-[#ffc83f] text-[#f5a914]" />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function YourStandingCard({ standing }: { standing: PlayerStanding | null }) {
  return (
    <aside className="rounded-[28px] border border-[#eadcff] bg-white/70 p-5 shadow-[0_18px_38px_rgba(138,112,199,0.16)] backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#8b78d8]">
          Your standing
        </p>
        <Star className="h-6 w-6 fill-[#ffc83f] text-[#f5a914]" />
      </div>
      {standing ? (
        <>
          <div className="flex items-center gap-3">
            <Avatar seed={standing.userId} name={standing.name} size="md" />
            <div className="min-w-0">
              <p className="truncate text-lg font-black text-[#17123d]">{standing.name}</p>
              <p className="text-sm font-semibold text-[#655f91]">Rank #{standing.rank}</p>
            </div>
          </div>
          <p className="mt-5 text-3xl font-black text-[#6741d9]">
            <AnimatedPoints value={standing.score} /> pts
          </p>
          <p className="mt-1 text-sm font-semibold text-[#655f91]">
            Best in {standing.bestGameTitle}
          </p>
        </>
      ) : (
        <div className="rounded-[22px] bg-[#f7f2ff] px-4 py-5 text-sm font-semibold text-[#625b92]">
          Play a game and submit a score to appear here.
        </div>
      )}
    </aside>
  );
}

function DecorativeTrophy() {
  return (
    <div className="pointer-events-none absolute right-5 top-5 z-0 hidden h-72 w-80 md:block">
      {confetti.map((piece, index) => (
        <span
          key={`${piece.left}-${piece.top}`}
          className="leaderboard-confetti absolute h-3 w-7 rounded-full opacity-80 shadow-sm"
          style={{
            left: piece.left,
            top: piece.top,
            backgroundColor: piece.color,
            transform: `rotate(${piece.rotate})`,
            animationDelay: `${index * 180}ms`,
          }}
        />
      ))}
      <Sparkles className="leaderboard-sparkle absolute left-8 top-14 h-8 w-8 fill-[#ffd15a] text-[#ffd15a]" />
      <Sparkles className="leaderboard-sparkle absolute right-2 top-8 h-9 w-9 fill-[#ffe071] text-[#ffe071]" />
      <Sparkles className="leaderboard-sparkle absolute bottom-20 left-1 h-7 w-7 fill-[#ffcf5d] text-[#ffcf5d]" />
      <div className="absolute bottom-0 right-2 h-16 w-56 rounded-[50%] bg-[#c7b1ff] opacity-55 blur-sm" />
      <div className="absolute bottom-3 right-12 h-12 w-44 rounded-[50%] bg-[linear-gradient(180deg,#dcccff,#b99ef2)] shadow-[0_14px_30px_rgba(132,99,209,0.24)]" />
      <div className="absolute bottom-11 right-24 h-10 w-20 rounded-b-[22px] bg-[linear-gradient(180deg,#b99cf1,#9572db)]" />
      <div className="leaderboard-trophy absolute right-[68px] top-[68px] grid h-36 w-40 place-items-center rounded-b-[48px] rounded-t-[62px] bg-[linear-gradient(145deg,#e6d5ff,#9d7be6_72%)] shadow-[inset_12px_10px_18px_rgba(255,255,255,0.35),0_22px_42px_rgba(109,79,190,0.32)]">
        <Star className="h-16 w-16 fill-[#ffc94f] text-[#f3a922] drop-shadow-[0_5px_7px_rgba(155,99,0,0.22)]" />
      </div>
      <div className="absolute right-8 top-24 h-20 w-14 rounded-r-full border-[12px] border-l-0 border-[#a386e7]" />
      <div className="absolute right-[236px] top-24 h-20 w-14 rounded-l-full border-[12px] border-r-0 border-[#b99ff0]" />
    </div>
  );
}

function Podium({ standings }: { standings: PlayerStanding[] }) {
  const ordered = [standings[1], standings[0], standings[2]].filter(Boolean);

  return (
    <section className="relative z-10 mb-7 grid grid-cols-1 gap-5 md:grid-cols-3 md:items-start">
      {ordered.map((standing, index) => (
        <WinnerCard
          key={standing.userId}
          standing={standing}
          index={index}
          centered={standing.rank === 1}
        />
      ))}
    </section>
  );
}

function WinnerCard({
  standing,
  index,
  centered,
}: {
  standing: PlayerStanding;
  index: number;
  centered: boolean;
}) {
  const style = winnerStyles[standing.rank - 1] ?? winnerStyles[2];
  const orderClass =
    standing.rank === 1
      ? "md:order-2"
      : standing.rank === 2
        ? "md:order-1 md:mt-14"
        : "md:order-3 md:mt-20";

  return (
    <article
      className={`${orderClass} ${style.card} leaderboard-card group relative rounded-[32px] border p-5 text-center transition duration-500 hover:-translate-y-2 hover:shadow-[0_30px_70px_rgba(95,72,140,0.24)] ${
        centered ? "min-h-[430px] md:scale-[1.04]" : "min-h-[360px]"
      }`}
      style={{ animationDelay: `${160 + index * 90}ms` }}
    >
      {standing.rank === 1 ? (
        <Crown className="leaderboard-crown absolute left-1/2 top-[-30px] h-16 w-24 -translate-x-1/2" />
      ) : null}

      <div
        className={`${style.medal} leaderboard-medal absolute left-5 top-5 grid h-16 w-16 place-items-center rounded-full border-2 text-3xl font-black shadow-[0_10px_20px_rgba(102,73,151,0.18)]`}
      >
        {standing.rank}
      </div>

      <div
        className={`${style.frame} mx-auto mt-8 grid ${
          centered ? "h-44 w-44" : "h-36 w-36"
        } place-items-center rounded-full border-4 p-2 shadow-[inset_0_0_0_6px_rgba(255,255,255,0.52),0_16px_32px_rgba(99,76,139,0.18)]`}
      >
        <Avatar seed={standing.userId} name={standing.name} size={centered ? "xl" : "lg"} />
      </div>

      <h2 className="mt-6 text-2xl font-black text-[#16113b]">{standing.name}</h2>
      <p className="mt-1 text-sm font-bold text-[#655f91]">Best in {standing.bestGameTitle}</p>
      <div className="mt-3 flex items-center justify-center gap-2 text-xl font-black text-[#1f1a4d]">
        <Star className="h-7 w-7 fill-[#ffc83f] text-[#f5a914]" />
        <span>
          <AnimatedPoints value={standing.score} /> pts
        </span>
      </div>
      <div
        className={`${style.label} mx-auto mt-6 inline-flex rounded-[18px] border px-7 py-3 text-base font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]`}
      >
        {style.copy}
      </div>
    </article>
  );
}

function LeaderboardTable({
  rows,
  selectedRange,
  selectedStanding,
  onSelectRow,
}: {
  rows: PlayerStanding[];
  selectedRange: DateRange;
  selectedStanding: PlayerStanding | null;
  onSelectRow: (rank: number) => void;
}) {
  return (
    <section className="leaderboard-table relative z-10 rounded-[30px] border border-white bg-white/88 px-5 py-5 shadow-[0_24px_54px_rgba(94,79,139,0.14)]">
      <div className="mb-4 flex flex-col gap-3 rounded-[22px] border border-[#eee7ff] bg-[linear-gradient(105deg,#faf7ff,#fff7fb)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#8b78d8]">
            Selected profile
          </p>
          <p className="mt-1 text-xl font-black text-[#17123d]">
            {selectedStanding
              ? `${selectedStanding.name} · Rank ${selectedStanding.rank}`
              : "No profile selected"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-[#615a91]">
          <span className="rounded-full bg-white/80 px-3 py-2 shadow-sm">{selectedRange.note}</span>
          {selectedStanding ? (
            <span className="rounded-full bg-[#fff0ba] px-3 py-2 text-[#9a4e08] shadow-sm">
              {selectedStanding.submissions} score
              {selectedStanding.submissions === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          <div className="grid grid-cols-[76px_minmax(0,1fr)_150px_34px] items-center border-b border-[#e9e3f5] px-3 pb-4 text-base font-bold text-[#4b467d]">
            <span>Rank</span>
            <span>Player</span>
            <span className="text-right">Points</span>
            <span />
          </div>

          {rows.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm font-semibold text-[#655f91]">
              Fewer than four ranked profiles for this range.
            </div>
          ) : (
            <div
              className="max-h-[560px] divide-y divide-[#eee8f5] overflow-y-auto pr-3"
              style={{
                scrollbarColor: "#b9aae7 #ece7f8",
                scrollbarWidth: "thin",
              }}
            >
              {rows.map((row, index) => (
                <LeaderboardTableRow
                  key={row.userId}
                  index={index}
                  row={row}
                  onSelect={() => onSelectRow(row.rank)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function LeaderboardTableRow({
  row,
  index,
  onSelect,
}: {
  row: PlayerStanding;
  index: number;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className="leaderboard-row grid w-full grid-cols-[76px_minmax(0,1fr)_150px_34px] items-center gap-0 rounded-[22px] px-3 py-4 text-left transition duration-300 hover:bg-[#faf7ff]"
      style={{ animationDelay: `${360 + index * 55}ms` }}
      onClick={onSelect}
    >
      <span className="text-3xl font-black text-[#655fba]">{row.rank}</span>
      <div className="flex min-w-0 items-center gap-4">
        <div
          className={`${rowAvatarClasses[index % rowAvatarClasses.length]} h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-white shadow-[0_10px_20px_rgba(82,67,125,0.15)]`}
        >
          <Avatar seed={row.userId} name={row.name} size="sm" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xl font-black text-[#17123d]">{row.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-[#514c7d]">
            <span className="rounded-full bg-[#ebe6ff] px-3 py-1 text-[#6554cb]">
              {row.bestGameTitle}
            </span>
            <span>{row.submissions} submissions</span>
          </div>
        </div>
      </div>
      <span className="text-right text-xl font-bold text-[#39336f]">
        <AnimatedPoints value={row.score} /> pts
      </span>
      <span
        className="ml-auto grid h-9 w-9 place-items-center rounded-full text-[#6d57d7] transition hover:bg-[#f0ebff]"
        aria-hidden="true"
      >
        <ChevronRight className="h-7 w-7" />
      </span>
    </button>
  );
}

function LoadingState() {
  return (
    <div className="relative z-10 rounded-[30px] border border-white bg-white/82 px-8 py-16 text-center shadow-[0_24px_54px_rgba(94,79,139,0.14)]">
      <div className="leaderboard-medal mx-auto mb-6 grid h-20 w-20 place-items-center rounded-[28px] bg-[#f2ebff]">
        <Trophy className="h-10 w-10 text-[#7358d7]" />
      </div>
      <h2 className="text-3xl font-black text-[#17123d]">Loading leaderboard</h2>
      <p className="mx-auto mt-3 max-w-md text-base font-medium text-[#655f91]">
        Fetching score rows and building profile standings.
      </p>
    </div>
  );
}

function ErrorState({ error }: { error: unknown }) {
  const message = getErrorMessage(error);

  return (
    <div className="relative z-10 rounded-[30px] border border-[#ffc8d2] bg-white/86 px-8 py-16 text-center shadow-[0_24px_54px_rgba(94,79,139,0.14)]">
      <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-[28px] bg-[#ffe8ef]">
        <Trophy className="h-10 w-10 text-[#c84d73]" />
      </div>
      <h2 className="text-3xl font-black text-[#17123d]">Leaderboard failed to load</h2>
      <p className="mx-auto mt-3 max-w-xl text-base font-medium text-[#7a4a62]">{message}</p>
      <p className="mx-auto mt-4 max-w-xl text-sm font-semibold text-[#8b78a4]">
        Browser console includes the query state, raw error, logged-in user id, and derived
        standings snapshot.
      </p>
    </div>
  );
}

function EmptyState({ selectedRange }: { selectedRange: DateRange }) {
  return (
    <div className="relative z-10 rounded-[30px] border border-white bg-white/82 px-8 py-16 text-center shadow-[0_24px_54px_rgba(94,79,139,0.14)]">
      <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-[28px] bg-[#f2ebff]">
        <Trophy className="h-10 w-10 text-[#7358d7]" />
      </div>
      <h2 className="text-3xl font-black text-[#17123d]">No ranked profiles yet</h2>
      <p className="mx-auto mt-3 max-w-md text-base font-medium text-[#655f91]">
        No submitted scores match {selectedRange.label}. Once players submit scores, their real
        profiles will appear here.
      </p>
    </div>
  );
}

function FooterBanner({ selectedRange }: { selectedRange: DateRange }) {
  return (
    <div className="leaderboard-footer relative z-10 mt-7 flex flex-col items-center justify-center gap-3 rounded-[28px] border border-[#dbcaf9] bg-[linear-gradient(100deg,#ffe8f0,#f4e9ff_48%,#eef1ff)] bg-[length:180%_180%] px-6 py-7 text-center text-2xl font-black text-[#694fc0] shadow-[0_18px_44px_rgba(148,112,197,0.16)] sm:flex-row sm:gap-5">
      <Star className="leaderboard-spin h-10 w-10 text-[#7c55d8]" />
      <span>☆ Climb the ranks and become a legend! 🌟</span>
      <span className="rounded-full bg-white/70 px-3 py-1 text-sm font-bold text-[#6d5bb4]">
        {selectedRange.label}
      </span>
      <Star className="leaderboard-spin h-10 w-10 fill-[#ffd257] text-[#f3ad22]" />
      <Sparkles className="absolute right-8 top-4 h-5 w-5 fill-white text-white" />
      <Sparkles className="absolute left-8 bottom-5 h-4 w-4 fill-white text-white" />
    </div>
  );
}

function Avatar({
  seed,
  name,
  size,
}: {
  seed: string;
  name: string;
  size: "sm" | "md" | "lg" | "xl";
}) {
  const sizeClass =
    size === "xl"
      ? "h-40 w-40"
      : size === "lg"
        ? "h-32 w-32"
        : size === "md"
          ? "h-14 w-14"
          : "h-full w-full";

  return (
    <img
      src={getDiceBearAvatarUrlFromSeed(seed || name)}
      alt={`${name} avatar`}
      className={`${sizeClass} rounded-full object-cover drop-shadow-[0_14px_18px_rgba(75,55,111,0.18)] transition duration-500 group-hover:scale-105`}
    />
  );
}

function AnimatedPoints({ value }: { value: number }) {
  return (
    <span key={value} className="leaderboard-number tabular-nums">
      {formatPoints(value)}
    </span>
  );
}

function buildStandings(rows: LeaderboardEntry[], range: DateRange) {
  const now = Date.now();
  const minimumTime = range.days === null ? null : now - range.days * 24 * 60 * 60 * 1000;
  const filteredRows =
    minimumTime === null
      ? rows
      : rows.filter((row) => new Date(row.created_at).getTime() >= minimumTime);

  const byUser = new Map<
    string,
    {
      userId: string;
      name: string;
      score: number;
      bestScore: number;
      bestGameTitle: string;
      bestGameSlug: string;
      submissions: number;
      lastPlayedAt: string;
    }
  >();

  for (const row of filteredRows) {
    const existing = byUser.get(row.user_id);
    const displayName = row.username?.trim() || "Anonymous player";

    if (!existing) {
      byUser.set(row.user_id, {
        userId: row.user_id,
        name: displayName,
        score: row.score,
        bestScore: row.score,
        bestGameTitle: row.game_title || "GameHub",
        bestGameSlug: row.game_slug || "",
        submissions: 1,
        lastPlayedAt: row.created_at,
      });
      continue;
    }

    existing.score += row.score;
    existing.submissions += 1;
    if (row.score > existing.bestScore) {
      existing.bestScore = row.score;
      existing.bestGameTitle = row.game_title || "GameHub";
      existing.bestGameSlug = row.game_slug || "";
    }
    if (new Date(row.created_at) > new Date(existing.lastPlayedAt)) {
      existing.lastPlayedAt = row.created_at;
    }
  }

  return Array.from(byUser.values())
    .sort((a, b) => b.score - a.score)
    .map((standing, index) => ({
      rank: index + 1,
      userId: standing.userId,
      name: standing.name,
      score: standing.score,
      bestGameTitle: standing.bestGameTitle,
      bestGameSlug: standing.bestGameSlug,
      submissions: standing.submissions,
      lastPlayedAt: standing.lastPlayedAt,
    }));
}

function formatPoints(points: number) {
  return points.toLocaleString("en-US");
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown leaderboard error";
  }
}

function LeaderboardMotionStyles() {
  return (
    <style>
      {`
        @keyframes leaderboard-fade-up {
          from {
            opacity: 0;
            translate: 0 18px;
            scale: 0.98;
          }
          to {
            opacity: 1;
            translate: 0 0;
            scale: 1;
          }
        }

        @keyframes leaderboard-pop {
          from {
            opacity: 0;
            translate: 0 -8px;
            scale: 0.96;
          }
          to {
            opacity: 1;
            translate: 0 0;
            scale: 1;
          }
        }

        @keyframes leaderboard-float {
          0%, 100% {
            transform: translateY(0) rotate(-1deg);
          }
          50% {
            transform: translateY(-10px) rotate(1deg);
          }
        }

        @keyframes leaderboard-crown-float {
          0%, 100% {
            transform: translateX(-50%) translateY(0) rotate(-1deg);
          }
          50% {
            transform: translateX(-50%) translateY(-8px) rotate(1deg);
          }
        }

        @keyframes leaderboard-sparkle {
          0%, 100% {
            opacity: 0.72;
            transform: scale(0.92) rotate(0deg);
          }
          50% {
            opacity: 1;
            transform: scale(1.14) rotate(12deg);
          }
        }

        @keyframes leaderboard-confetti {
          0%, 100% {
            translate: 0 0;
          }
          50% {
            translate: 0 -8px;
          }
        }

        @keyframes leaderboard-glow {
          0%, 100% {
            box-shadow: 0 10px 22px rgba(255, 194, 58, 0.28);
          }
          50% {
            box-shadow: 0 10px 30px rgba(255, 194, 58, 0.46);
          }
        }

        @keyframes leaderboard-shimmer {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        @keyframes leaderboard-number {
          from {
            translate: 0 6px;
            opacity: 0;
          }
          to {
            translate: 0 0;
            opacity: 1;
          }
        }

        .leaderboard-reveal,
        .leaderboard-card,
        .leaderboard-table,
        .leaderboard-row {
          animation: leaderboard-fade-up 620ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }

        .leaderboard-pop {
          animation: leaderboard-pop 180ms ease-out both;
        }

        .leaderboard-trophy {
          animation: leaderboard-float 4.6s ease-in-out infinite;
        }

        .leaderboard-crown {
          animation: leaderboard-crown-float 4.2s ease-in-out infinite;
        }

        .leaderboard-sparkle {
          animation: leaderboard-sparkle 2.5s ease-in-out infinite;
        }

        .leaderboard-confetti {
          animation: leaderboard-confetti 3.2s ease-in-out infinite;
        }

        .leaderboard-medal {
          animation: leaderboard-glow 2.8s ease-in-out infinite;
        }

        .leaderboard-footer {
          animation: leaderboard-shimmer 7s ease-in-out infinite;
        }

        .leaderboard-number {
          display: inline-block;
          animation: leaderboard-number 260ms ease-out both;
        }

        .leaderboard-spin {
          transition: transform 360ms ease;
        }

        .leaderboard-footer:hover .leaderboard-spin {
          transform: rotate(18deg) scale(1.08);
        }

        @media (prefers-reduced-motion: reduce) {
          .leaderboard-reveal,
          .leaderboard-card,
          .leaderboard-table,
          .leaderboard-row,
          .leaderboard-pop,
          .leaderboard-trophy,
          .leaderboard-crown,
          .leaderboard-sparkle,
          .leaderboard-confetti,
          .leaderboard-medal,
          .leaderboard-footer,
          .leaderboard-number {
            animation: none;
          }
        }
      `}
    </style>
  );
}

function Crown({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 80" aria-hidden="true" className={className}>
      <path
        d="M16 58L28 24l24 24 18-34 19 34 24-24 11 34H16z"
        fill="url(#crownGradient)"
        stroke="#e4a321"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <rect
        x="20"
        y="56"
        width="80"
        height="14"
        rx="7"
        fill="#ffc946"
        stroke="#e4a321"
        strokeWidth="4"
      />
      <defs>
        <linearGradient id="crownGradient" x1="22" x2="92" y1="18" y2="68">
          <stop stopColor="#fff39b" />
          <stop offset="0.54" stopColor="#ffc94b" />
          <stop offset="1" stopColor="#f4a51d" />
        </linearGradient>
      </defs>
    </svg>
  );
}
