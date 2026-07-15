import { test, expect, type Page } from "@playwright/test";
import {
  createSessions,
  destroySessions,
  createAccountViaUI,
  signIn,
  deleteTestUsers,
  generateTestCredentials,
  getAdminClient,
  createSessionLog,
  attachLogCapture,
  summarizeLogs,
  BASE_URL,
} from "./utils";
import type { Session, SessionLog, TestUser } from "./utils";

const PLAYER_COUNT = 5;
const PIN_PATTERN = /^[A-Z0-9]{6}$/;

type FailureRecord = { area: string; message: string; session?: string };

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

    // Attach log capture to each session
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
    await deleteTestUsers(users);
    await destroySessions(sessions);
  });

  test("five players — create accounts, play full round", async () => {
    // ── Phase 1: Account creation via real UI ──────────────────────────
    try {
      for (let i = 0; i < sessions.length; i++) {
        const username = `e2e_${Date.now().toString(36)}_db${i + 1}`;
        const email = `${username}@${generateTestCredentials({ retry: 0, workerIndex: 0 }).emailDomain}`;
        const user = await createAccountViaUI(sessions[i].page, email, password, username);
        users.push(user);
        await signIn(sessions[i].page, email, password);
        console.log(`[draw-battle] ${sessions[i].config.name}: account created & signed in`);
      }
    } catch (e) {
      failures.push({ area: "auth", message: String(e) });
      return;
    }

    // ── Phase 2: Navigate to Paint & Guess lobby ────────────────────────
    try {
      await Promise.all(
        sessions.map((s) => s.page.goto("/hub/games/paint-and-guess")),
      );
      // Wait for the lazy-loaded game component
      await expect(
        sessions[0].page.getByText("Multiplayer Draw & Guess"),
      ).toBeVisible({ timeout: 30_000 });
    } catch (e) {
      failures.push({ area: "lobby.navigate", message: String(e) });
    }

    // Read player names (auto-filled from profiles)
    let usernames: string[] = [];
    try {
      for (const s of sessions) {
        const input = s.page.getByPlaceholder("Enter your name");
        await expect(input).toBeVisible({ timeout: 10_000 });
        const name = await input.inputValue();
        usernames.push(name.trim());
      }
      const uniqueNames = new Set(usernames.filter(Boolean));
      if (uniqueNames.size !== PLAYER_COUNT) {
        failures.push({
          area: "lobby.names",
          message: `Expected ${PLAYER_COUNT} unique names, got ${uniqueNames.size}: ${usernames.join(", ")}`,
        });
      }
    } catch (e) {
      failures.push({ area: "lobby.names", message: String(e) });
    }

    // ── Phase 3: Host creates room ──────────────────────────────────────
    const host = sessions[0].page;
    const roomName = `e2e-${Date.now()}`;
    let gamePin = "";

    try {
      await host.getByPlaceholder("Room name").fill(roomName);
      await host.getByRole("button", { name: "Create Room" }).click();

      // Read PIN from Supabase
      const admin = getAdminClient();
      const { data } = await admin
        .from("game_rooms")
        .select("id, game_pin")
        .eq("name", roomName)
        .eq("owner_id", users[0].id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data?.game_pin) {
        failures.push({ area: "room.create", message: "Could not read created room PIN from Supabase" });
        return;
      }
      gamePin = data.game_pin;
      expect(gamePin).toMatch(PIN_PATTERN);
      console.log(`[draw-battle] Room created with PIN: ${gamePin}`);
    } catch (e) {
      failures.push({ area: "room.create", message: String(e) });
    }

    // ── Phase 4: Guests join room ───────────────────────────────────────
    try {
      for (let i = 1; i < PLAYER_COUNT; i++) {
        const guest = sessions[i].page;
        await guest.getByPlaceholder("Enter 6-letter PIN").fill(gamePin);
        await guest.getByRole("button", { name: "Join Room" }).click();

        // Host should see player count increment
        await expect(host.getByText(`Players (${i + 1})`)).toBeVisible({ timeout: 10_000 });
      }
    } catch (e) {
      failures.push({ area: "room.join", message: String(e) });
    }

    // ── Phase 5: Verify lobby state ─────────────────────────────────────
    try {
      await expect(host.getByText("Players (5)")).toBeVisible({ timeout: 5_000 });
      for (const name of usernames) {
        await expect(host.getByText(name, { exact: false }).first()).toBeVisible({ timeout: 5_000 });
      }
    } catch (e) {
      failures.push({ area: "lobby.players", message: String(e) });
    }

    // ── Phase 6: All players ready up ───────────────────────────────────
    try {
      for (const s of sessions) {
        await s.page.getByRole("button", { name: "Ready Up" }).click();
      }

      // Wait for all "Ready" indicators
      await expect
        .poll(async () => host.getByText("Ready", { exact: true }).count(), { timeout: 15_000 })
        .toBe(PLAYER_COUNT);

      await expect(host.getByRole("button", { name: "Start Game" })).toBeEnabled({ timeout: 5_000 });

      // Guests should not see Start Game
      for (let i = 1; i < PLAYER_COUNT; i++) {
        const guestBtn = sessions[i].page.getByRole("button", { name: "Start Game" });
        const count = await guestBtn.count();
        if (count > 0) {
          failures.push({
            area: "lobby.start_button",
            message: `Session ${i} (${sessions[i].config.name}) can see Start Game button`,
          });
        }
      }
    } catch (e) {
      failures.push({ area: "lobby.ready", message: String(e) });
    }

    // ── Phase 7: Host starts game ───────────────────────────────────────
    try {
      await host.getByRole("button", { name: "Start Game" }).click();
      await expect(
        host.getByText(/Round\s+1\s*\/\s*\d+/),
      ).toBeVisible({ timeout: 30_000 });
    } catch (e) {
      failures.push({ area: "game.start", message: String(e) });
    }

    // ── Phase 8: Identify drawer, verify word hiding ────────────────────
    let drawerIndex = -1;
    let secretWord = "";

    try {
      // Find which session is the drawer
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
        failures.push({ area: "game.drawer", message: "Could not identify drawer or read secret word" });
      }
    } catch (e) {
      failures.push({ area: "game.drawer", message: String(e) });
    }

    // ── Phase 9: Drawing propagation ────────────────────────────────────
    try {
      if (drawerIndex >= 0) {
        const drawerPage = sessions[drawerIndex].page;

        // Read initial canvas state from all guessers
        const beforeDrawing = await Promise.all(
          sessions
            .filter((_, i) => i !== drawerIndex)
            .map((s) => readCanvasData(s.page)),
        );

        // Perform a simple stroke
        await drawStroke(drawerPage);

        // Poll that canvas data changed on all guessers
        await expect
          .poll(
            async () => {
              const afterDrawing = await Promise.all(
                sessions
                  .filter((_, i) => i !== drawerIndex)
                  .map((s) => readCanvasData(s.page)),
              );
              return afterDrawing.filter((data, i) => data !== beforeDrawing[i]).length;
            },
            { timeout: 30_000, message: "Drawing should sync to all guessers" },
          )
          .toBe(PLAYER_COUNT - 1);
      }
    } catch (e) {
      failures.push({ area: "game.drawing", message: String(e) });
    }

    // ── Phase 10: Guessing ─────────────────────────────────────────────
    try {
      if (secretWord && drawerIndex >= 0) {
        const guessers = sessions.filter((_, i) => i !== drawerIndex);
        for (let i = 0; i < guessers.length; i++) {
          const guesserPage = guessers[i].page;
          const input = guesserPage.getByPlaceholder("Type your guess...");
          await expect(input).toBeVisible({ timeout: 10_000 });
          await input.fill(secretWord);
          await input.press("Enter");
          await pageWaitsForGuessAcceptance(guesserPage);
        }
      }
    } catch (e) {
      failures.push({ area: "game.guessing", message: String(e) });
    }

    // ── Phase 11: Verify round 2 advances ──────────────────────────────
    try {
      // After all correct guesses, round should advance
      await expect(
        host.getByText(/Round\s+2\s*\/\s*\d+/),
      ).toBeVisible({ timeout: 45_000 });
    } catch (e) {
      failures.push({ area: "game.round2", message: String(e) });
    }

    // ── Report ─────────────────────────────────────────────────────────
    if (failures.length > 0) {
      console.error("DRAW BATTLE FAILURES:");
      for (const f of failures) {
        console.error(`  [${f.area}] ${f.message}`);
      }
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

async function pageWaitsForGuessAcceptance(page: Page): Promise<void> {
  await expect
    .poll(
      async () => {
        const bodyText = await page.locator("body").innerText().catch(() => "");
        const inputValue = await page
          .getByPlaceholder("Type your guess...")
          .inputValue()
          .catch(() => null);
        return (
          inputValue === "" ||
          bodyText.includes("Correct!") ||
          /Round\s+2\s*\/\s*\d+/.test(bodyText)
        );
      },
      { timeout: 15_000, message: "Guesses should be accepted" },
    )
    .toBe(true);
}
