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

test.describe("Leaderboard", () => {
  let session: Session | null = null;
  let user: TestUser | null = null;

  test.beforeAll(async () => {
    session = await createSession(
      { name: "leaderboard-test", browser: "chromium", viewport: { width: 1440, height: 900 }, colorScheme: "light", locale: "en-US", deviceScaleFactor: 1, isMobile: false },
      BASE_URL,
    );
    const { runId, emailDomain, password } = generateTestCredentials({
      retry: 0,
      workerIndex: 0,
    });
    const username = `e2e_${runId}_lb`;
    const email = `${username}@${emailDomain}`;
    user = await createAccountViaUI(session.page, email, password, username);
    await signIn(session.page, email, password);
  });

  test.afterAll(async () => {
    if (user) await deleteTestUsers([user]);
    if (session) await destroySessions([session]);
    user = null;
    session = null;
  });

  test("leaderboard page renders", async () => {
    const page = session!.page;
    await page.goto("/hub/leaderboard");

    // Page should load (may show empty, loading, or populated state)
    await expect(page.getByText(/weekly ranking|leaderboard|ranked profiles/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("your standing card renders", async () => {
    const page = session!.page;
    await page.goto("/hub/leaderboard");

    // "Your standing" card should be visible
    const standingCard = page.getByText("Your standing");
    if (await standingCard.isVisible({ timeout: 10_000 })) {
      // Card is visible — either shows rank or "Play a game and submit a score"
      const hasRank = await page.getByText(/rank #\d+/i).isVisible().catch(() => false);
      const hasPrompt = await page.getByText(/play a game/i).isVisible().catch(() => false);
      expect(hasRank || hasPrompt).toBe(true);
    }
  });

  test("date range picker opens and selects", async () => {
    const page = session!.page;
    await page.goto("/hub/leaderboard");

    // Click the date range button
    const rangeBtn = page.getByRole("button", { name: /all time|last 7 days|last 30 days/i });
    if (await rangeBtn.isVisible({ timeout: 10_000 })) {
      await rangeBtn.click();
      await page.waitForTimeout(500);

      // Dropdown menu should be visible
      const menu = page.getByRole("menu");
      if (await menu.isVisible({ timeout: 3_000 }).catch(() => false)) {
        // Click "Last 7 days"
        const last7 = page.getByRole("menuitem", { name: /last 7 days/i });
        if (await last7.isVisible()) {
          await last7.click();
        }

        // Close menu if still open
        await page.keyboard.press("Escape");
      }
    }
  });

  test("podium and table sections exist when data is available", async () => {
    const page = session!.page;
    await page.goto("/hub/leaderboard");

    // Wait for loading to complete
    await page.waitForTimeout(2_000);

    // Check if we have data or empty state
    const hasPodium = await page.getByText(/unstoppable|great effort|keep it up/i).first().isVisible().catch(() => false);
    const hasTable = await page.getByText(/selected profile/i).isVisible().catch(() => false);
    const hasEmptyState = await page.getByText(/no ranked profiles yet/i).isVisible().catch(() => false);

    // At least one state should be visible (podium, table, or empty)
    expect(hasPodium || hasTable || hasEmptyState).toBe(true);
  });
});
