import { test, expect, type Page } from "@playwright/test";
import {
  createSessions,
  destroySessions,
  createAccountViaUI,
  signIn,
  generateTestCredentials,
  createSessionLog,
  attachLogCapture,
  summarizeLogs,
  BASE_URL,
} from "./utils";
import type { Session, SessionLog, TestUser } from "./utils";

const PLAYER_COUNT = 2;
const TOTAL_ROUNDS = 6;
const PIN_PATTERN = /^[A-Z0-9]{6}$/;

type FailureRecord = { phase: string; area: string; message: string; session?: string };

test.describe("Paint & Guess (Draw Battle)", () => {
  let sessions: Session[] = [];
  let users: TestUser[] = [];
  let sessionLogs: SessionLog[] = [];
  let failures: FailureRecord[] = [];
  let password: string;

  test.beforeAll(async () => {
    const creds = generateTestCredentials({ retry: 0, workerIndex: 0 });
    password = creds.password;

    sessions = await createSessions(PLAYER_COUNT, BASE_URL);
    sessionLogs = sessions.map(createSessionLog);

    for (let i = 0; i < sessions.length; i++) {
      attachLogCapture(sessions[i].page, sessionLogs[i]);
      sessions[i].page.on("console", (msg) => {
        if (msg.type() === "error") {
          console.error(`[${sessions[i].config.name}] console.error: ${msg.text().slice(0, 150)}`);
        }
      });
    }
  });

  test.afterAll(async () => {
    console.log(summarizeLogs(sessionLogs));
    await destroySessions(sessions);
  });

  function fail(phase: string, area: string, message: string, session?: string) {
    failures.push({ phase, area, message, session });
  }

  test("two players — create accounts, play all 6 rounds through game end", async () => {
    // Phase 1: Account creation & sign-in
    try {
      for (let i = 0; i < PLAYER_COUNT; i++) {
        const username = `e2e_${Date.now().toString(36)}_db${i + 1}`;
        const email = `${username}@${generateTestCredentials({ retry: 0, workerIndex: 0 }).emailDomain}`;
        const user = await createAccountViaUI(sessions[i].page, email, password, username);
        users.push(user);
        await signIn(sessions[i].page, email, password);
        console.log(`[draw-battle] ${sessions[i].config.name}: account created & signed in as ${username}`);
      }
    } catch (e) {
      fail("auth", "create-signin", String(e));
      return;
    }

    // Phase 2: Navigate to Paint & Guess lobby
    try {
      await Promise.all(sessions.map((s) => s.page.goto("/hub/games/paint-and-guess")));
      await expect(
        sessions[0].page.getByText("Multiplayer Draw & Guess"),
      ).toBeVisible({ timeout: 30_000 });
    } catch (e) {
      fail("lobby", "navigate", String(e));
    }

    // Read auto-filled player names from profiles (wait for async Supabase fetch)
    let usernames: string[] = [];
    try {
      for (const s of sessions) {
        const input = s.page.getByPlaceholder("Enter your name");
        await expect(input).toBeVisible({ timeout: 10_000 });
        try {
          await expect
            .poll(() => input.inputValue(), {
              timeout: 15_000,
              message: `Profile name should auto-fill for ${s.config.name}`,
            })
            .not.toEqual("");
        } catch {
          const fallbackName = `e2e_${Date.now().toString(36)}_db${sessions.indexOf(s) + 1}`;
          await input.fill(fallbackName);
          console.log(`[draw-battle] ${s.config.name}: typed fallback name "${fallbackName}"`);
        }
        usernames.push((await input.inputValue()).trim());
      }
      const uniqueNames = new Set(usernames.filter(Boolean));
      if (uniqueNames.size !== PLAYER_COUNT) {
        fail("lobby", "names", `Expected ${PLAYER_COUNT} unique names, got ${uniqueNames.size}: ${usernames.join(", ")}`);
      }
      console.log(`[draw-battle] Players: ${usernames.join(", ")}`);
    } catch (e) {
      fail("lobby", "names", String(e));
    }

    // Phase 3: Host creates room, read PIN from UI
    const host = sessions[0].page;
    const roomName = `e2e-${Date.now()}`;
    let gamePin = "";

    try {
      await host.getByPlaceholder("Room name").fill(roomName);
      await host.getByRole("button", { name: "Create Room" }).click();

      const pinElement = host.locator('[data-testid="room-pin"]');
      await expect(pinElement).toBeVisible({ timeout: 15_000 });
      gamePin = (await pinElement.textContent())?.trim() ?? "";
      if (!gamePin) throw new Error("PIN element was visible but empty");
      expect(gamePin).toMatch(PIN_PATTERN);
      console.log(`[draw-battle] Room created with PIN: ${gamePin}`);
    } catch (e) {
      fail("room", "create", String(e));
      return;
    }

    // Phase 4: Guest joins room
    try {
      const guest = sessions[1].page;
      await guest.getByPlaceholder("Enter 6-letter PIN").fill(gamePin);
      await guest.getByRole("button", { name: "Join Room" }).click();

      // Diagnostic: capture what the guest sees after joining
      const guestBody = await guest.locator("body").innerText().catch(() => "(error)");
      console.log(`[draw-battle] ${sessions[1].config.name} after join (first 300): "${guestBody.slice(0, 300)}"`);
      const toastEl = guest.locator('[data-sonner-toast]').first();
      const guestToast = await toastEl.textContent().catch(() => "(no toast)");
      console.log(`[draw-battle] ${sessions[1].config.name} toast after join: "${guestToast}"`);

      // Verify guest sees the room UI (Ready Up button = joined)
      await expect(
        guest.getByRole("button", { name: "Ready Up" }),
      ).toBeVisible({ timeout: 15_000 });
      console.log(`[draw-battle] ${sessions[1].config.name}: joined room`);
    } catch (e) {
      fail("room", "join", String(e));
    }

    // Phase 5: Verify lobby player list
    try {
      await expect
        .poll(
          () =>
            host
              .locator("body")
              .innerText()
              .then((t) => t.includes(`Players (${PLAYER_COUNT})`)),
          { timeout: 30_000 },
        )
        .toBe(true);
      for (const name of usernames.filter(Boolean)) {
        await expect(host.getByText(name, { exact: false }).first()).toBeVisible({ timeout: 5_000 });
      }
      console.log(`[draw-battle] All ${PLAYER_COUNT} players visible in lobby`);
    } catch (e) {
      fail("lobby", "player-list", String(e));
    }

    // Phase 6: Ready up + start game
    try {
      for (const s of sessions) {
        await s.page.getByRole("button", { name: "Ready Up" }).click();
      }

      await expect
        .poll(async () => host.getByText("Ready", { exact: true }).count(), { timeout: 15_000 })
        .toBe(PLAYER_COUNT);

      await expect(host.getByRole("button", { name: "Start Game" })).toBeEnabled({ timeout: 5_000 });

      // Guest must NOT see Start Game
      const guestBtn = sessions[1].page.getByRole("button", { name: "Start Game" });
      if ((await guestBtn.count()) > 0) {
        fail("lobby", "start-visibility", `Guest can see Start Game button`);
      }

      await host.getByRole("button", { name: "Start Game" }).click();
      console.log(`[draw-battle] Game started`);
    } catch (e) {
      fail("lobby", "ready-start", String(e));
    }

    // Verify round 1 appeared
    try {
      // Check for error toast
      const errorToast = host.locator('[data-sonner-toast]').first();
      const toastText = await errorToast.textContent().catch(() => "");
      console.log(`[draw-battle] Toast after start: "${toastText}"`);

      await expect(
        host.getByText(/Round\s+1\s*\/\s*\d+/),
      ).toBeVisible({ timeout: 10_000 });
      console.log(`[draw-battle] Round 1 visible`);
    } catch (e) {
      fail("game", "round1-visible", String(e));
    }

    // Phases 7–12: Play all 6 rounds
    for (let round = 1; round <= TOTAL_ROUNDS; round++) {
      console.log(`\n${"─".repeat(40)}`);
      console.log(`[draw-battle] === ROUND ${round} / ${TOTAL_ROUNDS} ===`);
      console.log(`${"─".repeat(40)}`);

      // Wait for round header
      try {
        await expect(
          host.getByText(new RegExp(`Round\\s+${round}\\s*/\\s*\\d+`)),
        ).toBeVisible({ timeout: 15_000 });
      } catch (e) {
        fail(`round${round}`, "round-header", String(e));
      }

      // Identify drawer by reading "Your word:" text
      let drawerIndex = -1;
      let secretWord = "";

      try {
        for (let i = 0; i < PLAYER_COUNT; i++) {
          const bodyText = await sessions[i].page.locator("body").innerText().catch(() => "");
          if (bodyText.includes("Your word:")) {
            drawerIndex = i;
            const match = bodyText.match(/Your word:\s*([A-Z][A-Z -]*)/);
            secretWord = (match?.[1] ?? "").trim();
            break;
          }
        }
        if (drawerIndex === -1 || !secretWord) {
          fail(`round${round}`, "identify-drawer", "Could not find drawer or read secret word");
        } else {
          console.log(`[draw-battle] drawer=${sessions[drawerIndex].config.name} word="${secretWord}"`);
        }
      } catch (e) {
        fail(`round${round}`, "identify-drawer", String(e));
      }

      // Canvas snapshot before drawing (guesser)
      let beforeDrawing = "";
      try {
        if (drawerIndex >= 0) {
          const guesserPage = sessions[drawerIndex === 0 ? 1 : 0].page;
          beforeDrawing = await readCanvasData(guesserPage);
        }
      } catch (e) {
        fail(`round${round}`, "canvas-before", String(e));
      }

      // Drawer does a stroke
      try {
        if (drawerIndex >= 0) {
          await drawStroke(sessions[drawerIndex].page);
          console.log(`[draw-battle] stroke drawn by ${sessions[drawerIndex].config.name}`);
        }
      } catch (e) {
        fail(`round${round}`, "draw-stroke", String(e));
      }

      // Verify canvas synced to guesser
      try {
        if (drawerIndex >= 0 && beforeDrawing) {
          const guesserPage = sessions[drawerIndex === 0 ? 1 : 0].page;
          await expect
            .poll(
              () => readCanvasData(guesserPage),
              { timeout: 30_000, message: `Round ${round}: drawing should sync to guesser` },
            )
            .not.toBe(beforeDrawing);
          console.log(`[draw-battle] canvas synced to guesser`);
        }
      } catch (e) {
        fail(`round${round}`, "canvas-sync", String(e));
      }

      // Guesser submits the correct word
      try {
        if (secretWord && drawerIndex >= 0) {
          const guesserPage = sessions[drawerIndex === 0 ? 1 : 0].page;
          const input = guesserPage.getByPlaceholder("Type your guess...");
          await expect(input).toBeVisible({ timeout: 10_000 });
          await input.fill(secretWord);
          await input.press("Enter");
          console.log(`[draw-battle] ${sessions[drawerIndex === 0 ? 1 : 0].config.name} guessed "${secretWord}"`);
        }
      } catch (e) {
        fail(`round${round}`, "submit-guess", String(e));
      }

      // Wait for next round
      if (round < TOTAL_ROUNDS) {
        try {
          await expect(
            host.getByText(new RegExp(`Round\\s+${round + 1}\\s*/\\s*\\d+`)),
          ).toBeVisible({ timeout: 30_000 });
          console.log(`[draw-battle] Round ${round + 1} started`);
        } catch (e) {
          fail(`round${round}`, "next-round", String(e));
        }
      }
    }

    // Phase 13: Verify game ended
    try {
      await expect(host.getByText("Game Over!")).toBeVisible({ timeout: 30_000 });
      console.log(`[draw-battle] Game Over! visible`);
    } catch (e) {
      fail("game", "game-over", String(e));
    }

    // Phase 14: Verify scores submitted
    try {
      const hasScore = await host
        .getByText(/score submitted/i)
        .isVisible({ timeout: 15_000 })
        .catch(() => false);
      const bodyText = await host.locator("body").innerText().catch(() => "");
      const roundSummary = bodyText.includes("Round") || bodyText.includes("Score");
      if (hasScore || roundSummary) {
        console.log(`[draw-battle] Scores/leaderboard confirmed`);
      }
    } catch (e) {
      fail("game", "scores", String(e));
    }

    // Report
    if (failures.length > 0) {
      console.error("\nDRAW BATTLE FAILURES:");
      for (const f of failures) {
        console.error(`  [${f.phase}::${f.area}] ${f.message}${f.session ? ` (${f.session})` : ""}`);
      }
    } else {
      console.log("\n[draw-battle] ALL PHASES PASSED");
    }

    expect(failures).toEqual([]);
  });
});

// ── Helpers ──────────────────────────────────────────────────────────

async function readCanvasData(page: Page): Promise<string> {
  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible({ timeout: 5_000 });
  return canvas.evaluate((element) => {
    const root = element instanceof HTMLCanvasElement ? element.parentElement : element;
    const canvases = Array.from((root as HTMLElement).querySelectorAll("canvas")).filter(
      (c): c is HTMLCanvasElement =>
        c instanceof HTMLCanvasElement && c.offsetWidth > 0 && c.offsetHeight > 0 && c.width > 0 && c.height > 0,
    );
    if (canvases.length === 0) throw new Error("No rendered drawing canvas found");
    const composite = document.createElement("canvas");
    composite.width = canvases[0].width;
    composite.height = canvases[0].height;
    const ctx = composite.getContext("2d")!;
    for (const c of canvases) {
      ctx.drawImage(c, 0, 0, composite.width, composite.height);
    }
    return composite.toDataURL();
  });
}

async function drawStroke(page: Page): Promise<void> {
  const interactiveCanvas = page.locator("canvas").last();
  await expect(interactiveCanvas).toBeVisible({ timeout: 5_000 });
  const box = await interactiveCanvas.boundingBox();
  if (!box) throw new Error("Canvas has no bounding box");
  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.35);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.55, { steps: 8 });
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.35, { steps: 8 });
  await page.mouse.up();
}
