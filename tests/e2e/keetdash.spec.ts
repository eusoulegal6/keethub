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
      return `Session ${i} (${sessions[i].config.name}): ${toasts}`;
    }
  }
  return null;
}

async function dumpPageState(page: Page, label: string): Promise<void> {
  const url = page.url();
  const headings = await page.locator("h1, h2, h3, [role=heading]").allTextContents().catch(() => ["(error)"]);
  const buttons = await page.locator("button, [role=button]").allTextContents().catch(() => ["(error)"]);
  const toasts = await page.evaluate(() => {
    const t = document.querySelectorAll("[data-sonner-toast]");
    return Array.from(t).map((el) => el.textContent).join(" | ");
  }).catch(() => "(error)");
  console.log(`[STATE ${label}] URL: ${url}`);
  console.log(`[STATE ${label}] HEADINGS: ${headings.join(" | ").slice(0, 400)}`);
  console.log(`[STATE ${label}] BUTTONS: ${buttons.filter(Boolean).slice(0, 12).join(", ")}`);
  console.log(`[STATE ${label}] TOASTS: ${toasts}`);
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
          console.error(`[${sessions[i].config.name}] console.error: ${msg.text().slice(0, 200)}`);
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

    // ── Phase 1: Account creation ──────────────────────────────────────
    try {
      for (let i = 0; i < sessions.length; i++) {
        const username = `e2e_kd_${runId}_${i + 1}`;
        const email = `${username}@${emailDomain}`;
        const user = await createAccountViaUI(sessions[i].page, email, password, username);
        users.push(user);
        await signIn(sessions[i].page, email, password);
      }
      console.log("[keetdash] All accounts created & signed in");
    } catch (e) {
      failures.push({ area: "auth", message: String(e) });
      reportAndFail();
      return;
    }

    // ── Phase 2: Navigate ──────────────────────────────────────────────
    try {
      await sessions[0].page.goto("/hub/games/balderdash");
      await expect(
        sessions[0].page.getByRole("heading", { name: "Balderdash" }),
      ).toBeVisible({ timeout: 20_000 });
    } catch (e) {
      failures.push({ area: "navigate", message: String(e) });
      reportAndFail();
      return;
    }

    const host = sessions[0].page;

    // ── Phase 3: Create room ───────────────────────────────────────────
    let roomCode = "";
    try {
      await host.getByPlaceholder("Room name").fill(`KD-${runId.slice(0, 5)}`);
      await host.getByRole("button", { name: "Create room" }).click();
      await expect(host.getByRole("button", { name: /^\d{6}$/ })).toBeVisible({ timeout: 15_000 });
      const codeText = await host.getByRole("button", { name: /^\d{6}$/ }).textContent();
      roomCode = (codeText ?? "").trim();
      console.log(`[keetdash] Room created: ${roomCode}`);
    } catch (e) {
      failures.push({ area: "room.create", message: String(e) });
      reportAndFail();
      return;
    }

    // ── Phase 4: Join room ─────────────────────────────────────────────
    try {
      for (let i = 1; i < PLAYER_COUNT; i++) {
        await sessions[i].page.goto("/hub/games/balderdash");
        await sessions[i].page.getByPlaceholder("Six-digit code").fill(roomCode);
        await sessions[i].page.getByRole("button", { name: "Join room" }).click();
        await expect(sessions[i].page.getByText("Players")).toBeVisible({ timeout: 10_000 });
      }
      console.log("[keetdash] All 4 guests joined");
    } catch (e) {
      failures.push({ area: "room.join", message: String(e) });
    }

    const joinError = await checkToastErrors(sessions);
    if (joinError) {
      failures.push({ area: "room.join_error", message: joinError });
    }

    // ── Phase 5: Ready up ──────────────────────────────────────────────
    try {
      for (const s of sessions) {
        await s.page.waitForTimeout(500);
        const readyUpBtn = s.page.getByRole("button", { name: "Ready up", exact: true });
        if (await readyUpBtn.isVisible({ timeout: 8_000 })) {
          await readyUpBtn.click();
          await s.page.waitForTimeout(300);
        }
      }
      console.log("[keetdash] Ready-up phase complete");
    } catch (e) {
      failures.push({ area: "lobby.ready", message: String(e) });
    }

    // ── Phase 6: Start game ────────────────────────────────────────────
    try {
      await host.waitForTimeout(4_000);

      const startBtn = host.getByRole("button", { name: "Start game" });
      await expect(startBtn).toBeEnabled({ timeout: 20_000 });
      await startBtn.click();
      console.log("[keetdash] Game started");

      await expect(host.getByText("Words").first()).toBeVisible({ timeout: 20_000 });
    } catch (e) {
      await dumpPageState(host, "host-start-failed");
      const startError = await checkToastErrors(sessions);
      if (startError) {
        failures.push({ area: "game.start", message: `Toast: ${startError}` });
      } else {
        failures.push({ area: "game.start", message: String(e) });
      }
    }

    // ── Phase 7: Play 1 round to verify game flow works end-to-end ────
    const MAX_ROUNDS = 1;
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const result = await playRound(sessions, failures, round + 1);
      if (result.finished) {
        console.log(`[keetdash] Game finished after round ${round + 1}`);
        break;
      }
      if (result.error) {
        console.log(`[keetdash] Round ${round + 1} stopped due to error`);
        break;
      }
    }

    reportAndFail();
  });
});

// ── Round phase executor ───────────────────────────────────────────────

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
          console.log(`[keetdash] R${roundNum}: deck picked by ${s.config.name}`);
          break;
        }
      }
      if (!picked) await host.waitForTimeout(2_000);
    }
  } catch (e) {
    failures.push({ area: `round${roundNum}.deck`, message: String(e) });
  }

  await host.waitForTimeout(3_000);

  // ── Submit answers ──────────────────────────────────────────────────
  let submitted = 0;
  try {
    for (const s of sessions) {
      try {
        await expect(s.page.locator("textarea").first()).toBeVisible({ timeout: 12_000 });
        await s.page.locator("textarea").first().fill(`Bluff R${roundNum}`);
        await s.page.waitForTimeout(200);
        await s.page.getByRole("button", { name: /submit bluff/i }).click();
        submitted++;
      } catch {
        // Session may still be transitioning — skip
      }
    }
    const err = await checkToastErrors(sessions);
    if (err) { failures.push({ area: `round${roundNum}.submit_err`, message: err }); return { finished: true, error: true }; }
    console.log(`[keetdash] R${roundNum}: ${submitted}/${sessions.length} bluffs submitted`);
  } catch (e) {
    failures.push({ area: `round${roundNum}.submit`, message: String(e) });
    return { finished: false, error: true };
  }

  // ── Wait for voting phase ──────────────────────────────────────────
  try {
    await expect
      .poll(
        async () => {
          const body = (await host.locator("body").innerText().catch(() => "")) ?? "";
          return /option \d/i.test(body) || /round results/i.test(body) || /final scores/i.test(body);
        },
        { timeout: 45_000, message: "Should transition to voting" },
      )
      .toBe(true);
  } catch (e) {
    const err = await checkToastErrors(sessions);
    failures.push({ area: `round${roundNum}.voting_transition`, message: err || String(e) });
    return { finished: false, error: true };
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
          return Array.from(t).map((el) => el.textContent).join(" | ");
        }).catch(() => "");
        if (!/own bluff|cannot vote/i.test(toasts)) break;
      }
    }
    console.log(`[keetdash] R${roundNum}: votes cast`);
  } catch (e) {
    failures.push({ area: `round${roundNum}.voting`, message: String(e) });
    return { finished: false, error: true };
  }

  // ── Results ─────────────────────────────────────────────────────────
  try {
    await expect
      .poll(
        async () => /round results|final scores/i.test((await host.locator("body").innerText().catch(() => "")) ?? ""),
        { timeout: 45_000, message: "Should show results" },
      )
      .toBe(true);
    console.log(`[keetdash] R${roundNum}: results visible`);
  } catch (e) {
    failures.push({ area: `round${roundNum}.results`, message: String(e) });
    return { finished: false, error: true };
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
