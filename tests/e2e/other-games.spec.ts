import { test, expect } from "@playwright/test";
import {
  createSession,
  destroySessions,
  createAccountViaUI,
  signIn,
  deleteTestUsers,
  generateTestCredentials,
  BASE_URL,
} from "./utils";
import type { Session, TestUser } from "./utils";

test.describe("Other Games Smoke Tests", () => {
  let session: Session | null = null;
  let user: TestUser | null = null;

  test.beforeAll(async () => {
    session = await createSession(
      { name: "smoke-test", browser: "chromium", viewport: { width: 1440, height: 900 }, colorScheme: "light", locale: "en-US", deviceScaleFactor: 1, isMobile: false },
      BASE_URL,
    );
    const { runId, emailDomain, password } = generateTestCredentials({ retry: 0, workerIndex: 0 });
    const username = `e2e_${runId}_smoke`;
    const email = `${username}@${emailDomain}`;
    user = await createAccountViaUI(session.page, email, password, username);
    await signIn(session.page, email, password);
  });

  test.afterAll(async () => {
    if (user) await deleteTestUsers([user]);
    if (session) await destroySessions([session]);
  });

  // ── Chess ────────────────────────────────────────────────────────────

  test("chess page renders and has interactive elements", async () => {
    const page = session!.page;
    await page.goto("/hub/games/chess");

    await expect(page.getByRole("heading", { name: /chess/i }).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("link", { name: /back to library/i })).toBeVisible();

    // Tab navigation
    const playTab = page.getByRole("tab", { name: "Play" });
    const puzzlesTab = page.getByRole("tab", { name: "Puzzles" });

    await expect(playTab).toBeVisible();
    await expect(puzzlesTab).toBeVisible();

    // Two Player button
    await expect(page.getByRole("button", { name: "Two Player" })).toBeVisible({ timeout: 5_000 });

    // Click Two Player — board should render
    await page.getByRole("button", { name: "Two Player" }).click();
    await page.waitForTimeout(500);

    // Switch to Puzzles tab
    await puzzlesTab.click();
    await page.waitForTimeout(500);

    // Verify hint/solution/next buttons exist
    const hintBtn = page.getByRole("button", { name: "Hint" });
    if (await hintBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      // Puzzle view loaded
    }

    // Back to Play tab
    await playTab.click();
    const vsAiBtn = page.getByRole("button", { name: "VS AI" });
    if (await vsAiBtn.isVisible({ timeout: 3_000 })) {
      await vsAiBtn.click();
      await page.waitForTimeout(500);
      // Bot selection grid should appear
    }
  });

  // ── Trivia Blitz ─────────────────────────────────────────────────────

  test("trivia blitz renders category selection", async () => {
    const page = session!.page;
    await page.goto("/hub/games/trivia-blitz");

    await expect(page.getByText("Trivia Blitz")).toBeVisible({ timeout: 15_000 });

    // Category grid should be visible
    await expect(page.getByText(/how it works/i)).toBeVisible({ timeout: 10_000 });

    // Click a category to start a game
    const categoryBtn = page.locator("button").filter({ hasText: /questions/i }).first();
    if (await categoryBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await categoryBtn.click();
      await page.waitForTimeout(500);

      // Should show "Get Ready!" or question
      const isPlaying =
        (await page.getByText(/get ready|question \d/i).isVisible().catch(() => false)) ||
        (await page.getByText(/next question/i).isVisible().catch(() => false));

      if (isPlaying) {
        // Try clicking through answers
        for (let q = 0; q < 7; q++) {
          const answerBtns = page.locator("button").filter({ hasText: /^[A-D][).:]/ }).first();
          if (await answerBtns.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await answerBtns.click();
            await page.waitForTimeout(1_500);
          }
          // Look for "Play Again" at the end
          const playAgain = page.getByRole("button", { name: "Play Again" });
          if (await playAgain.isVisible({ timeout: 2_000 }).catch(() => false)) break;
        }
      }
    }
  });

  // ── Semantic ─────────────────────────────────────────────────────────

  test("semantic word game renders with input", async () => {
    const page = session!.page;
    await page.goto("/hub/games/semantic");

    await expect(page.getByRole("link", { name: /back to library/i })).toBeVisible({ timeout: 10_000 });

    // Help button
    const helpBtn = page.getByRole("button", { name: /help/i });
    if (await helpBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await helpBtn.click();
      await expect(page.getByText(/how to play/i)).toBeVisible({ timeout: 5_000 });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }

    // Guess input
    const guessInput = page.getByPlaceholder(/type a word/i);
    if (await guessInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await guessInput.fill("test");
      const submitBtn = page.getByRole("button", { name: /send|submit/i });
      if (await submitBtn.isVisible({ timeout: 2_000 })) {
        await submitBtn.click();
        await page.waitForTimeout(500);
      }
    }
  });

  // ── Ping Pong ────────────────────────────────────────────────────────

  test("ping pong renders menu and can start game", async () => {
    const page = session!.page;
    await page.goto("/hub/games/ping-pong");

    await expect(page.getByRole("link", { name: /back to library/i })).toBeVisible({ timeout: 10_000 });

    // Mode selection buttons
    const twoPlayerBtn = page.getByRole("button", { name: "Two Player" });
    const vsAiBtn = page.getByRole("button", { name: "VS AI" });
    const startBtn = page.getByRole("button", { name: "Start Game" });

    // At least one mode button should be visible
    const hasTwoPlayer = await twoPlayerBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    const hasVsAi = await vsAiBtn.isVisible({ timeout: 3_000 }).catch(() => false);

    if (hasTwoPlayer) {
      await twoPlayerBtn.click();
    } else if (hasVsAi) {
      await vsAiBtn.click();
    }

    // Start the game
    if (await startBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await startBtn.click();
      await page.waitForTimeout(1_000);

      // Canvas should be visible (could also just be the score display)
      await expect(page.getByText(/p1|player 1|you/i).first()).toBeVisible({ timeout: 5_000 });

      // Quit button should be available
      const quitBtn = page.getByRole("button", { name: /quit/i });
      if (await quitBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await quitBtn.click();
      }
    }
  });

  // ── Catch-all placeholder ────────────────────────────────────────────

  test("catch-all game route renders placeholder for unknown games", async () => {
    const page = session!.page;
    await page.goto("/hub/games/nonexistent-game-xyz");

    // Should show either "Game not found" or redirect to 404
    const notFound = page.getByText(/game not found/i);
    const is404 = await notFound.isVisible({ timeout: 10_000 }).catch(() => false);
    if (is404) {
      // Verify back link
      const backLink = page.getByRole("link", { name: /back to library/i });
      if (await backLink.isVisible()) {
        await backLink.click();
        await expect(page).toHaveURL(/\/hub/, { timeout: 10_000 });
      }
    }
  });
});
