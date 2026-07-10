import { Chess } from "chess.js";

const WASM_SUPPORTED =
  typeof WebAssembly === "object" &&
  WebAssembly.validate(Uint8Array.of(0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));

const WORKER_URL = WASM_SUPPORTED
  ? "/stockfish/stockfish.wasm.js"
  : "/stockfish/stockfish.js";

const PIECE_VALUES: Record<string, number> = { q: 9, r: 5, b: 3.3, n: 3.2, p: 1 };

function heuristicMove(fen: string): string | null {
  let game: Chess;
  try { game = new Chess(fen); } catch { return null; }
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;
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

// ── Engine with sync callback ────────────────────────────────────

export type EngineCallback = (uci: string) => void;

interface Job {
  fen: string;
  depth: number;
  elo?: number;
  callback: EngineCallback;
}

class StockfishEngine {
  private worker: Worker | null = null;
  private ready = false;
  private failed = false;
  private queue: Job[] = [];
  private pending: Job | null = null;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private bootTimer: ReturnType<typeof setTimeout> | null = null;

  private ensureWorker() {
    if (this.worker || this.failed) return;
    try {
      console.log("[SF] Creating worker");
      this.worker = new Worker(WORKER_URL);
      this.worker.addEventListener("message", this.onMessage);
      this.worker.addEventListener("error", (e) => {
        console.error("[SF] Error:", e.message);
        this.failed = true;
        this.drainWithFallback();
      });
      this.worker.postMessage("uci");
      this.bootTimer = setTimeout(() => {
        if (!this.ready && !this.failed) {
          console.warn("[SF] Boot timeout");
          this.failed = true;
          this.drainWithFallback();
        }
      }, 30_000);
    } catch (e) {
      console.error("[SF] Cannot create worker:", e);
      this.failed = true;
      this.drainWithFallback();
    }
  }

  private onMessage = (e: MessageEvent) => {
    const text = typeof e.data === "string" ? e.data.trim() : "";
    if (!text) return;

    if (text.includes("uciok")) {
      this.worker?.postMessage("isready");
      return;
    }

    if (text.includes("readyok")) {
      if (this.bootTimer) { clearTimeout(this.bootTimer); this.bootTimer = null; }
      console.log("[SF] Ready");
      this.ready = true;
      if (this.queue.length > 0) {
        const job = this.queue.shift()!;
        this.runJob(job);
      }
      return;
    }

    if (text.startsWith("info ")) {
      this.resetSearchTimer();
      return;
    }

    const best = text.match(/^bestmove\s+(\S+)/);
    if (best) {
      console.log("[SF] bestmove:", best[1]);
      if (this.searchTimer) { clearTimeout(this.searchTimer); this.searchTimer = null; }
      const uci = best[1];
      if (this.pending) {
        const cb = this.pending.callback;
        this.pending = null;
        cb(uci);
      }
      if (this.queue.length > 0) {
        const job = this.queue.shift()!;
        this.runJob(job);
      }
      return;
    }
  };

  private resetSearchTimer() {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => this.onSearchTimeout(), 30_000);
    }
  }

  private onSearchTimeout() {
    console.warn("[SF] Search timeout, fallback");
    if (this.pending) {
      const fb = heuristicMove(this.pending.fen);
      if (fb) this.pending.callback(fb);
      this.pending = null;
    }
    if (this.queue.length > 0) {
      const job = this.queue.shift()!;
      this.runJob(job);
    }
  }

  private drainWithFallback() {
    if (this.pending) {
      const fb = heuristicMove(this.pending.fen);
      if (fb) this.pending.callback(fb);
      this.pending = null;
    }
    while (this.queue.length > 0) {
      const job = this.queue.shift()!;
      const fb = heuristicMove(job.fen);
      if (fb) job.callback(fb);
    }
  }

  private runJob(job: Job) {
    const w = this.worker;
    if (!w || !this.ready) {
      const fb = heuristicMove(job.fen);
      if (fb) job.callback(fb);
      return;
    }
    this.pending = job;
    console.log("[SF] go depth", job.depth);
    if (job.elo) {
      w.postMessage("setoption name UCI_LimitStrength value true");
      w.postMessage(`setoption name UCI_Elo value ${job.elo}`);
    } else {
      w.postMessage("setoption name UCI_LimitStrength value false");
    }
    w.postMessage("ucinewgame");
    w.postMessage(`position fen ${job.fen}`);
    w.postMessage(`go depth ${job.depth}`);
    this.searchTimer = setTimeout(() => this.onSearchTimeout(), 30_000);
  }

  // ── Public API ──────────────────────────────────────────────────

  /** Request a best move. Calls callback(uci) synchronously when ready. */
  requestMove(fen: string, depth: number, elo: number | undefined, callback: EngineCallback) {
    if (this.failed) {
      const fb = heuristicMove(fen);
      if (fb) callback(fb);
      return;
    }
    if (!this.ready) {
      this.queue.push({ fen, depth, elo, callback });
      this.ensureWorker();
      return;
    }
    if (this.pending) {
      this.queue.push({ fen, depth, elo, callback });
      return;
    }
    this.runJob({ fen, depth, elo, callback });
  }

  terminate() {
    if (this.bootTimer) clearTimeout(this.bootTimer);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    if (this.worker) {
      this.worker.postMessage("quit");
      this.worker.terminate();
      this.worker = null;
    }
    this.ready = false;
    this.failed = false;
  }
}

export const stockfishEngine = new StockfishEngine();
