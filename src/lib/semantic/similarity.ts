/**
 * Character n-gram word embedding engine.
 *
 * Generates a deterministic 64‑dimensional vector for any word by extracting
 * its character trigrams, hashing each trigram to seed 64 pseudo‑random
 * values (mulberry32), summing all partial vectors, and normalising to unit
 * length.  Two words that share many substrings therefore point in roughly
 * the same direction — a fastText‑style morphological proxy for semantics.
 *
 * This runs entirely client‑side: zero network calls, zero external data.
 */

// ── Trigram extraction ──────────────────────────────────────────

function trigrams(word: string): string[] {
  const padded = `  ${word.toLowerCase().replace(/[^a-z]/g, "")} `;
  const out: string[] = [];
  for (let i = 0; i <= padded.length - 3; i++) {
    out.push(padded.slice(i, i + 3));
  }
  return out;
}

// ── PRNG with 32‑bit seed ───────────────────────────────────────

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── String hash → 32‑bit integer ────────────────────────────────

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h;
}

// ── Word → 64‑dim normalised vector ─────────────────────────────

const DIMS = 64;

function wordToVector(word: string): number[] {
  const tris = trigrams(word);
  if (tris.length === 0) return new Array(DIMS).fill(0);

  const vec = new Array(DIMS).fill(0);

  for (const tri of tris) {
    const rng = mulberry32(hashStr(tri));
    // Generate 64 random values from the trigram seed
    for (let d = 0; d < DIMS; d++) {
      // Standard normal via Box‑Muller on two uniforms
      const u1 = rng();
      const u2 = rng();
      const n = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
      vec[d] += n;
    }
  }

  // Normalise to unit length
  const mag = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  if (mag > 0) {
    for (let d = 0; d < DIMS; d++) vec[d] /= mag;
  }

  return vec;
}

// ── Cosine similarity → 0‑100 percentage ────────────────────────

export function getSimilarity(guess: string, target: string): number {
  const a = wordToVector(guess);
  const b = wordToVector(target);

  let dot = 0;
  for (let d = 0; d < DIMS; d++) dot += a[d] * b[d];

  // Clamp floating‑point edge cases
  const clamped = Math.max(-1, Math.min(1, dot));
  // Convert from [-1,1] to [0,100]
  return Math.round(((clamped + 1) / 2) * 100);
}

// ── Validate ─────────────────────────────────────────────────────

export function isValidWord(word: string): boolean {
  const trimmed = word.trim();
  return trimmed.length >= 2 && /^[a-z]+$/i.test(trimmed);
}

// ── Daily word ───────────────────────────────────────────────────

/** ~200 common nouns / adjectives — one per day, seeded by UTC date */
const DAILY_WORDS: string[] = [
  "ocean", "mountain", "forest", "sunset", "thunder", "garden", "castle", "dragon",
  "pirate", "robot", "rocket", "planet", "music", "dance", "dream", "magic",
  "treasure", "adventure", "mystery", "puzzle", "shadow", "silver", "golden",
  "crystal", "storm", "river", "desert", "island", "bridge", "tower", "candle",
  "mirror", "lion", "eagle", "dolphin", "piano", "guitar", "camera", "compass",
  "engine", "galaxy", "jungle", "volcano", "glacier", "comet", "spirit", "legend",
  "wisdom", "courage", "harmony", "autumn", "winter", "summer", "spring", "dawn",
  "midnight", "twilight", "meadow", "canyon", "waterfall", "rainbow", "horizon",
  "coast", "harbor", "lagoon", "reef", "coral", "whale", "phoenix", "falcon",
  "tiger", "panda", "aurora", "nebula", "meteor", "eclipse", "temple", "palace",
  "cottage", "village", "harbour", "anchor", "sailor", "captain", "warrior",
  "wizard", "knight", "castle", "throne", "empire", "kingdom", "valley", "prairie",
  "savanna", "tundra", "oasis", "mirage", "monsoon", "typhoon", "blizzard",
  "avalanche", "earthquake", "tsunami", "firefly", "butterfly", "dragonfly",
  "hummingbird", "nightingale", "peacock", "diamond", "emerald", "sapphire",
  "ruby", "amber", "pearl", "coral", "jade", "quartz", "marble", "granite",
  "velvet", "silk", "cotton", "linen", "canvas", "parchment", "lantern",
  "telescope", "microscope", "clock", "pendulum", "labyrinth", "maze",
  "riddle", "cipher", "code", "melody", "symphony", "chorus", "sonnet",
  "ballad", "fable", "parable", "myth", "saga", "epic", "odyssey", "voyage",
  "expedition", "quest", "journey", "passage", "frontier", "horizon",
  "paradise", "utopia", "sanctuary", "refuge", "asylum", "haven",
  "champion", "hero", "guardian", "sentinel", "sentinel", "prophet",
  "oracle", "sage", "scholar", "artist", "poet", "scout", "ranger",
  "nomad", "wanderer", "pilgrim", "stranger", "outlaw", "rebel",
  "pioneer", "explorer", "inventor", "builder", "architect", "creator",
];

export function getDailyWord(): string {
  const now = new Date();
  const utc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const days = Math.floor(utc / 86400000);
  return DAILY_WORDS[days % DAILY_WORDS.length];
}

/** Get nearby words for hints (orthographically similar to target) */
export function getHintWords(target: string, count: number, exclude: Set<string>): string[] {
  const scored = DAILY_WORDS
    .filter((w) => w !== target && !exclude.has(w))
    .map((w) => ({ word: w, sim: getSimilarity(w, target) }))
    .sort((a, b) => b.sim - a.sim);
  return scored.slice(0, count).map((x) => x.word);
}
