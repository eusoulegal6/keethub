import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  createSessions,
  destroySessions,
  createAccountViaUI,
  signIn,
  deleteTestUsers,
  generateTestCredentials,
  createSessionLog,
  attachLogCapture,
  summarizeLogs,
  BASE_URL,
} from "./utils";
import type { Session, SessionLog, TestUser } from "./utils";

const PLAYER_COUNT = 5;

type FailureRecord = { area: string; message: string; session?: string };

let failures: FailureRecord[] = [];

function sIdx(s: Session, sessions: Session[]): number {
  return sessions.findIndex((x) => x.id === s.id);
}

async function checkToastErrors(sessions: Session[]): Promise<string | null> {
  for (let i = 0; i < sessions.length; i++) {
    const toasts = await sessions[i].page.evaluate(() => {
      const t = document.querySelectorAll("[data-sonner-toast]");
      return Array.from(t).map((el) => el.textContent).join(" | ");
    }).catch(() => "");
    if (toasts && /error|failed|ambiguous|unauthorized/i.test(toasts)) {
      return `S${i} (${sessions[i].config.name}): ${toasts}`;
    }
  }
  return null;
}

async function dumpPageState(page: Page, label: string): Promise<void> {
  const url = page.url();
  const headings = await page.locator("h1, h2, h3, [role=heading]").allTextContents().catch(() => ["(err)"]);
  const buttons = await page.locator("button, [role=button]").allTextContents().catch(() => ["(err)"]);
  const toasts = await page.evaluate(() => {
    const t = document.querySelectorAll("[data-sonner-toast]");
    return Array.from(t).map((el) => el.textContent).join(" | ");
  }).catch(() => "(err)");
  console.log(`[STATE ${label}] ${headings.join(" | ").slice(0, 200)}`);
  console.log(`[STATE ${label}] btns: ${buttons.filter(Boolean).slice(0, 10).join(", ")}`);
  if (toasts) console.log(`[STATE ${label}] TOASTS: ${toasts}`);
}

test.describe("Keetdash (Balderdash)", () => {
  let sessions: Session[] = [];
  let users: TestUser[] = [];
  let sessionLogs: SessionLog[] = [];
  let password: string;

  test.beforeAll(async () => {
    failures = [];
    const creds = generateTestCredentials({ retry: 0, workerIndex: 0 });
    password = creds.password;
    sessions = await createSessions(PLAYER_COUNT, BASE_URL);
    sessionLogs = sessions.map(createSessionLog);
    for (let i = 0; i < sessions.length; i++) {
      attachLogCapture(sessions[i].page, sessionLogs[i]);
      sessions[i].page.on("console", (msg) => {
        if (msg.type() === "error") {
          console.error(`[${sessions[i].config.name}] ${msg.text().slice(0, 200)}`);
        }
      });
      // Also capture RPC responses to detect errors
      sessions[i].page.on("response", async (resp) => {
        if (resp.url().includes("/rpc/") && resp.status() !== 200) {
          console.error(`[${sessions[i].config.name}] RPC ${resp.status()}: ${resp.url().slice(-60)}`);
        }
      });
    }
  });

  test.afterAll(async () => {
    console.log(summarizeLogs(sessionLogs));
    await deleteTestUsers(users);
    await destroySessions(sessions);
  });

  test("five players — create accounts, play full keetdash game", async () => {
    const runId = Date.now().toString(36);
    const emailDomain = generateTestCredentials({ retry: 0, workerIndex: 0 }).emailDomain;

    // ── Auth ───────────────────────────────────────────────────────────
    try {
      for (let i = 0; i < sessions.length; i++) {
        const username = `e2e_kd_${runId}_${i + 1}`;
        const email = `${username}@${emailDomain}`;
        const user = await createAccountViaUI(sessions[i].page, email, password, username);
        users.push(user);
        await signIn(sessions[i].page, email, password);
      }
      console.log("[keetdash] auth OK");
    } catch (e) {
      failures.push({ area: "auth", message: String(e) }); reportAndFail(); return;
    }

    // ── Navigate ──────────────────────────────────────────────────────
    try {
      await sessions[0].page.goto("/hub/games/balderdash");
      await expect(sessions[0].page.getByRole("heading", { name: "Balderdash" })).toBeVisible({ timeout: 20_000 });
    } catch (e) {
      failures.push({ area: "navigate", message: String(e) }); reportAndFail(); return;
    }

    const host = sessions[0].page;

    // ── Create room ───────────────────────────────────────────────────
    let roomCode = "";
    try {
      await host.getByPlaceholder("Room name").fill(`KD-${runId.slice(0, 5)}`);
      await host.getByRole("button", { name: "Create room" }).click();
      await expect(host.getByRole("button", { name: /^\d{6}$/ })).toBeVisible({ timeout: 15_000 });
      roomCode = (await host.getByRole("button", { name: /^\d{6}$/ }).textContent())?.trim() ?? "";
      console.log(`[keetdash] room ${roomCode}`);
    } catch (e) {
      failures.push({ area: "room.create", message: String(e) }); reportAndFail(); return;
    }

    // ── Join ──────────────────────────────────────────────────────────
    try {
      for (let i = 1; i < PLAYER_COUNT; i++) {
        await sessions[i].page.goto("/hub/games/balderdash");
        await sessions[i].page.getByPlaceholder("Six-digit code").fill(roomCode);
        await sessions[i].page.getByRole("button", { name: "Join room" }).click();
        await expect(sessions[i].page.getByText("Players")).toBeVisible({ timeout: 10_000 });
      }
      console.log("[keetdash] all joined");
    } catch (e) {
      failures.push({ area: "room.join", message: String(e) });
    }
    const joinErr = await checkToastErrors(sessions);
    if (joinErr) failures.push({ area: "room.join_err", message: joinErr });

    // ── Ready up ──────────────────────────────────────────────────────
    try {
      for (const s of sessions) {
        await s.page.waitForTimeout(500);
        const btn = s.page.getByRole("button", { name: "Ready up", exact: true });
        if (await btn.isVisible({ timeout: 8_000 })) { await btn.click(); await s.page.waitForTimeout(300); }
      }
      console.log("[keetdash] ready");
    } catch (e) {
      failures.push({ area: "lobby.ready", message: String(e) });
    }

    // ── Start game ────────────────────────────────────────────────────
    try {
      await host.waitForTimeout(4_000);
      const startBtn = host.getByRole("button", { name: "Start game" });
      await expect(startBtn).toBeEnabled({ timeout: 20_000 });
      await startBtn.click();
      console.log("[keetdash] started");
      await expect(host.getByText("Words").first()).toBeVisible({ timeout: 20_000 });
    } catch (e) {
      await dumpPageState(host, "start-fail");
      const err = await checkToastErrors(sessions);
      failures.push({ area: "game.start", message: err || String(e) });
    }

    // ── Play 2 rounds ──────────────────────────────────────────────────
    for (let round = 0; round < 2; round++) {
      const result = await playRound(sessions, failures, round + 1);
      if (result.finished) { console.log(`[keetdash] finished after R${round + 1}`); break; }
      if (result.error) { console.log(`[keetdash] R${round + 1} error`); break; }
    }

    reportAndFail();
  });
});

// ── Round ──────────────────────────────────────────────────────────────

type RoundResult = { finished: boolean; error: boolean };

async function playRound(
  sessions: Session[],
  failures: FailureRecord[],
  roundNum: number,
): Promise<RoundResult> {
  const host = sessions[0].page;

  if (await host.getByText(/final scores|finished/i).isVisible().catch(() => false)) {
    return { finished: true, error: false };
  }

  // ── Deck selection ──────────────────────────────────────────────────
  try {
    let picked = false;
    for (let poll = 0; poll < 15 && !picked; poll++) {
      for (const s of sessions) {
        const btn = s.page.locator("button").filter({ hasText: "Words" });
        if (await btn.isVisible({ timeout: 1_000 }).catch(() => false)) {
          await btn.click();
          picked = true;
          console.log(`[keetdash] R${roundNum}: deck by ${s.config.name}`);
          break;
        }
      }
      if (!picked) await host.waitForTimeout(2_000);
    }

    // Wait for RPC to complete and phase to change
    await host.waitForTimeout(3_000);
    const deckErr = await checkToastErrors(sessions);
    if (deckErr) { failures.push({ area: `R${roundNum}.deck`, message: deckErr }); return { finished: true, error: true }; }
  } catch (e) {
    failures.push({ area: `R${roundNum}.deck`, message: String(e) });
  }

  // ── Wait for submission phase & submit ──────────────────────────────
  let submitted = 0;
  try {
    for (const s of sessions) {
      try {
        await expect(s.page.locator("textarea").first()).toBeVisible({ timeout: 15_000 });
        await s.page.locator("textarea").first().fill(`Bluff R${roundNum} S${sIdx(s, sessions)}`);
        await s.page.waitForTimeout(200);
        await s.page.getByRole("button", { name: /submit bluff/i }).click();
        submitted++;
      } catch {
        // skip — session not in submission phase yet
      }
    }

    // After all submissions, wait for the last RPC to process
    await host.waitForTimeout(4_000);
    const subErr = await checkToastErrors(sessions);
    if (subErr) { failures.push({ area: `R${roundNum}.submit_err`, message: subErr }); return { finished: true, error: true }; }
    console.log(`[keetdash] R${roundNum}: ${submitted}/${sessions.length} submitted`);
  } catch (e) {
    failures.push({ area: `R${roundNum}.submit`, message: String(e) }); return { finished: false, error: true };
  }

  // ── Wait for voting phase (poll ALL sessions, generous timeout) ─────
  try {
    let transitioned = false;
    for (let poll = 0; poll < 40 && !transitioned; poll++) {
      for (const s of sessions) {
        const body = (await s.page.locator("body").innerText().catch(() => "")) ?? "";
        if (/option \d/i.test(body) || /round results|final scores/i.test(body)) {
          transitioned = true;
          break;
        }
      }
      if (!transitioned) await host.waitForTimeout(2_000);

      // Check for toast errors during polling
      if (poll % 5 === 4) {
        const err = await checkToastErrors(sessions);
        if (err) { failures.push({ area: `R${roundNum}.vote_err`, message: err }); return { finished: true, error: true }; }
      }
    }

    if (!transitioned) {
      // Final diagnostic — dump all sessions
      for (const s of sessions) {
        await dumpPageState(s.page, `R${roundNum}-stuck-${s.config.name}`);
      }
      failures.push({ area: `R${roundNum}.voting_transition`, message: "Never reached voting phase" });
      return { finished: false, error: true };
    }
  } catch (e) {
    failures.push({ area: `R${roundNum}.vote_trans`, message: String(e) }); return { finished: false, error: true };
  }

  // ── Vote ────────────────────────────────────────────────────────────
  try {
    for (const s of sessions) {
      const optBtns = s.page.getByRole("button").filter({ hasText: /Option \d/i });
      const cnt = await optBtns.count().catch(() => 0);
      if (cnt === 0) continue;
      for (let a = 0; a < cnt; a++) {
        await optBtns.nth((a + sIdx(s, sessions)) % cnt).click();
        await s.page.waitForTimeout(200);
        const lock = s.page.getByRole("button", { name: /lock vote/i });
        if (await lock.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await lock.click();
          await s.page.waitForTimeout(500);
        }
        const toasts = await s.page.evaluate(() => {
          const t = document.querySelectorAll("[data-sonner-toast]");
          return Array.from(t).map(el => el.textContent).join(" | ");
        }).catch(() => "");
        if (!/own bluff|cannot vote/i.test(toasts)) break;
      }
    }
    console.log(`[keetdash] R${roundNum}: votes cast`);
  } catch (e) {
    failures.push({ area: `R${roundNum}.voting`, message: String(e) }); return { finished: false, error: true };
  }

  // Wait for last vote's RPC + broadcast + poll cycle
  await host.waitForTimeout(5_000);

  // ── Results ─────────────────────────────────────────────────────────
  try {
    await expect
      .poll(
        async () => /round results|final scores/i.test((await host.locator("body").innerText().catch(() => "")) ?? ""),
        { timeout: 45_000, message: "Should show round results" },
      )
      .toBe(true);
    console.log(`[keetdash] R${roundNum}: results`);
  } catch (e) {
    await dumpPageState(host, `R${roundNum}-no-results`);
    const err = await checkToastErrors(sessions);
    failures.push({ area: `R${roundNum}.results`, message: err || String(e) });
    return { finished: false, error: true };
  }

  // ── Next round ──────────────────────────────────────────────────────
  try {
    await expect
      .poll(
        async () => /next round|final scores/i.test((await host.locator("body").innerText().catch(() => "")) ?? ""),
        { timeout: 15_000, message: "Next round btn" },
      )
      .toBe(true);
    const nextBtn = host.getByRole("button", { name: /next round|show final scores/i });
    if (await nextBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await nextBtn.click();
      console.log(`[keetdash] R${roundNum}: advanced`);
    }
  } catch (e) {
    failures.push({ area: `R${roundNum}.next`, message: String(e) });
  }

  return { finished: false, error: false };
}

function reportAndFail() {
  if (failures.length > 0) {
    console.error("KEETDASH FAILURES:");
    for (const f of failures) {
      console.error(`  [${f.area}] ${f.message}`);
    }
  }
  expect(failures).toEqual([]);
}
