const WASM_SUPPORTED =
  typeof WebAssembly === "object" &&
  WebAssembly.validate(Uint8Array.of(0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));

const WORKER_PATH = WASM_SUPPORTED
  ? "/stockfish/stockfish.wasm.js"
  : "/stockfish/stockfish.js";

export interface EngineOptions {
  depth?: number;
  elo?: number;
}

interface QueuedRequest {
  fen: string;
  options: EngineOptions;
  resolve: (move: string) => void;
  reject: (err: Error) => void;
}

class StockfishEngine {
  private worker: Worker | null = null;
  private ready = false;
  private queue: QueuedRequest[] = [];
  private pendingResolve: ((move: string) => void) | null = null;
  private pendingReject: ((err: Error) => void) | null = null;
  private outputBuffer = "";

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(WORKER_PATH);
      this.worker.addEventListener("message", this.onMessage);
      this.worker.postMessage("uci");
    }
    return this.worker;
  }

  private onMessage = (e: MessageEvent) => {
    const text: string = e.data ?? "";
    this.outputBuffer += text + "\n";

    // UCI init complete
    if (text === "uciok") {
      this.ready = true;
      if (this.queue.length > 0) {
        const next = this.queue.shift()!;
        this.sendPosition(next);
      }
      return;
    }

    // Parse bestmove
    const bestMatch = text.match(/^bestmove\s+(\S+)/m);
    if (bestMatch) {
      const move = bestMatch[1];
      if (this.pendingResolve) {
        this.pendingResolve(move);
        this.pendingResolve = null;
        this.pendingReject = null;
      }
      // Process next in queue
      if (this.queue.length > 0) {
        const next = this.queue.shift()!;
        this.sendPosition(next);
      }
      return;
    }
  };

  private sendPosition(req: QueuedRequest) {
    const w = this.getWorker();
    const { fen, options } = req;
    this.pendingResolve = req.resolve;
    this.pendingReject = req.reject;

    // Apply elo limits if specified
    if (options.elo) {
      w.postMessage("setoption name UCI_LimitStrength value true");
      w.postMessage(`setoption name UCI_Elo value ${options.elo}`);
    } else {
      w.postMessage("setoption name UCI_LimitStrength value false");
    }

    w.postMessage("ucinewgame");
    w.postMessage(`position fen ${fen}`);
    const depth = options.depth ?? 12;
    w.postMessage(`go depth ${depth}`);

    // Safety timeout — if no response in 30s, use a fallback
    setTimeout(() => {
      if (this.pendingResolve === req.resolve && this.pendingReject === req.reject) {
        this.pendingResolve = null;
        this.pendingReject = null;
        req.reject(new Error("Stockfish timed out"));
        if (this.queue.length > 0) {
          const next = this.queue.shift()!;
          this.sendPosition(next);
        }
      }
    }, 30_000);
  }

  async getBestMove(fen: string, options: EngineOptions = {}): Promise<string> {
    const w = this.getWorker();

    if (!this.ready) {
      return new Promise((resolve, reject) => {
        this.queue.push({ fen, options, resolve, reject });
      });
    }

    if (this.pendingResolve) {
      return new Promise((resolve, reject) => {
        this.queue.push({ fen, options, resolve, reject });
      });
    }

    return new Promise((resolve, reject) => {
      this.sendPosition({ fen, options, resolve, reject });
    });
  }

  terminate() {
    if (this.worker) {
      this.worker.postMessage("quit");
      this.worker.removeEventListener("message", this.onMessage);
      this.worker.terminate();
      this.worker = null;
      this.ready = false;
    }
  }
}

export const stockfishEngine = new StockfishEngine();
