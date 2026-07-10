import { Chess } from "chess.js";

const WASM_SUPPORTED =
  typeof WebAssembly === "object" &&
  WebAssembly.validate(Uint8Array.of(0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));

const WORKER_URL = WASM_SUPPORTED
  ? "/stockfish/stockfish.wasm.js"
  : "/stockfish/stockfish.js";

// ── Heuristic fallback ───────────────────────────────────────────

const PIECE_VALUES: Record<string, number> = { q: 9, r: 5, b: 3.3, n: 3.2, p: 1 };

function heuristicMove(fen: string): string | null {
  let game: Chess;
  try { game = new Chess(fen); } catch { return null; }
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;

  // Score each move using a fresh clone per move (no mutating the board mid-loop)
  const scored = moves.map((m) => {
    let s = 0;
    const captured = game.get(m.to);
    if (captured) s += (PIECE_VALUES[captured.type] || 0) * 10;
    if (["d4", "d5", "e4", "e5"].includes(m.to)) s += 0.5;

    const clone = new Chess(game.fen());
    clone.move(m.from, m.to);
    if (clone.isCheck()) s += 3;
    if (clone.isCheckmate()) s += 100;

    return { from: m.from, to: m.to, promotion: m.promotion, score: s };
  });

  scored.sort((a, b) => b.score - a.score);
  const pick = scored[Math.floor(Math.random() * Math.min(3, scored.length))];
  return pick.from + pick.to + (pick.promotion || "");
}

// ── Engine singleton ─────────────────────────────────────────────

type Resolver = (move: string) => void;
type Rejecter = (err: Error) => void;

interface Job {
  fen: string;
  depth: number;
  elo?: number;
  resolve: Resolver;
  reject: Rejecter;
}

class StockfishEngine {
  private worker: Worker | null = null;
  private initPhase: "fresh" | "uci_sent" | "ready" | "failed" = "fresh";
  private queue: Job[] = [];
  private pending: Job | null = null;
  private searchTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private initTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private initError: string | null = null;

  private getWorker(): Worker | null {
    if (this.initPhase === "failed") {
      console.warn("[SF] getWorker called but engine has failed:", this.initError);
      return null;
    }
    if (this.worker) return this.worker;

    console.log("[SF] Creating worker from", WORKER_URL);
    try {
      this.worker = new Worker(WORKER_URL);
      this.initPhase = "uci_sent";
      this.worker.addEventListener("message", this.onMessage);
      this.worker.addEventListener("error", this.onWorkerError);
      this.worker.addEventListener("messageerror", () => {
        console.error("[SF] messageerror event");
        this.initError = "Worker message error";
        this.initPhase = "failed";
      });
      this.worker.postMessage("uci");

      // 30s bootstrap timeout (WASM init is slow on some devices)
      this.initTimeoutId = setTimeout(() => {
        if (this.initPhase !== "ready" && this.initPhase !== "failed") {
          console.warn("[SF] Bootstrap timeout — engine didn't reach ready state");
          this.initError = "Engine failed to initialize within 30s";
          this.initPhase = "failed";
          this.drainQueueWithFallback();
        }
      }, 30_000);
    } catch (e) {
      this.initError = `Cannot create worker: ${e instanceof Error ? e.message : String(e)}`;
      this.initPhase = "failed";
      return null;
    }

    return this.worker;
  }

  private onWorkerError = (e: ErrorEvent) => {
    console.error("[SF] Worker error:", e.message, e.filename);
    this.initError = `Worker error: ${e.message || "unknown"}`;
    this.initPhase = "failed";
    this.drainQueueWithFallback();
  };

  private onMessage = (e: MessageEvent) => {
    const text: string = typeof e.data === "string" ? e.data.trim() : "";
    if (!text) return;

    // ── Initialization ────────────────────────────────────────────
    if (text.includes("uciok")) {
      console.log("[SF] ← uciok — sending isready (options per-job)");
      // Don't set options here — just isready. Options are set per-job
      // before position/go. This avoids flooding the engine during init.
      this.worker?.postMessage("isready");
      return;
    }

    if (text.includes("readyok")) {
      if (this.initTimeoutId) { clearTimeout(this.initTimeoutId); this.initTimeoutId = null; }
      console.log("[SF] ← readyok — engine ready, queue:", this.queue.length);
      this.initPhase = "ready";
      if (this.queue.length > 0) {
        const job = this.queue.shift()!;
        this.processJob(job);
      }
      return;
    }

    // ── Best move ─────────────────────────────────────────────────
    const bestMatch = text.match(/^bestmove\s+(\S+)/);
    if (bestMatch) {
      console.log("[SF] ← bestmove:", bestMatch[1]);
      if (this.searchTimeoutId) { clearTimeout(this.searchTimeoutId); this.searchTimeoutId = null; }
      const move = bestMatch[1];
      if (this.pending) {
        this.pending.resolve(move);
        this.pending = null;
      }
      if (this.queue.length > 0) {
        const job = this.queue.shift()!;
        this.processJob(job);
      }
      return;
    }

    // Info lines during search — engine is alive, extend timeout
    if (text.startsWith("info ")) {
      this.extendSearchTimeout();
      return;
    }
  };

  private extendSearchTimeout() {
    if (this.searchTimeoutId) {
      clearTimeout(this.searchTimeoutId);
      this.searchTimeoutId = setTimeout(() => this.onSearchTimeout(), 30_000);
    }
  }

  private onSearchTimeout() {
    console.warn("[SF] Search timed out — using heuristic fallback");
    if (this.pending) {
      const fb = heuristicMove(this.pending.fen);
      if (fb) this.pending.resolve(fb);
      else this.pending.reject(new Error("Engine search timed out"));
      this.pending = null;
    }
    if (this.queue.length > 0) {
      const job = this.queue.shift()!;
      this.processJob(job);
    }
  }

  private drainQueueWithFallback() {
    console.warn("[SF] drainQueueWithFallback — reason:", this.initError, "pending:", !!this.pending, "queued:", this.queue.length);
    if (this.pending) {
      const fb = heuristicMove(this.pending.fen);
      if (fb) this.pending.resolve(fb);
      else this.pending.reject(new Error(this.initError ?? "Engine unavailable"));
      this.pending = null;
    }
    while (this.queue.length > 0) {
      const job = this.queue.shift()!;
      const fb = heuristicMove(job.fen);
      if (fb) job.resolve(fb);
      else job.reject(new Error(this.initError ?? "Engine unavailable"));
    }
  }

  private processJob(job: Job) {
    const w = this.worker;
    if (!w || this.initPhase !== "ready") {
      console.warn("[SF] processJob called but engine not ready, using heuristic");
      const fb = heuristicMove(job.fen);
      if (fb) job.resolve(fb);
      else job.reject(new Error("Engine not ready"));
      return;
    }

    this.pending = job;
    console.log("[SF] → position + go depth", job.depth, job.elo ? `(elo ${job.elo})` : "");

    if (job.elo) {
      w.postMessage("setoption name UCI_LimitStrength value true");
      w.postMessage(`setoption name UCI_Elo value ${job.elo}`);
    } else {
      w.postMessage("setoption name UCI_LimitStrength value false");
    }

    w.postMessage("ucinewgame");
    w.postMessage(`position fen ${job.fen}`);
    w.postMessage(`go depth ${job.depth}`);

    this.searchTimeoutId = setTimeout(() => this.onSearchTimeout(), 30_000);
  }

  // ── Public API ──────────────────────────────────────────────────

  async getBestMove(fen: string, depth: number, elo?: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const job: Job = { fen, depth, elo, resolve, reject };

      if (this.initPhase === "failed") {
        const fb = heuristicMove(fen);
        if (fb) resolve(fb);
        else reject(new Error(this.initError ?? "Engine unavailable"));
        return;
      }

      if (this.initPhase !== "ready") {
        this.queue.push(job);
        this.getWorker();
        return;
      }

      if (this.pending) {
        this.queue.push(job);
        return;
      }

      this.processJob(job);
    });
  }

  get isReady(): boolean { return this.initPhase === "ready"; }
  get hasFailed(): boolean { return this.initPhase === "failed"; }
  get failureReason(): string | null { return this.initError; }

  terminate() {
    if (this.initTimeoutId) clearTimeout(this.initTimeoutId);
    if (this.searchTimeoutId) clearTimeout(this.searchTimeoutId);
    if (this.worker) {
      this.worker.postMessage("quit");
      this.worker.removeEventListener("message", this.onMessage);
      this.worker.terminate();
      this.worker = null;
    }
    this.initPhase = "fresh";
    this.pending = null;
  }
}

export const stockfishEngine = new StockfishEngine();
