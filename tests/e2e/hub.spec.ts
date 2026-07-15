import { test, expect } from "@playwright/test";
import {
  createSessions,
  destroySessions,
  createAccountViaUI,
  signIn,
  deleteTestUsers,
  generateTestCredentials,
  BASE_URL,
} from "./utils";
import type { Session, TestUser } from "./utils";

test.describe("Hub Library & Navigation", () => {
  let sessions: Session[] = [];
  let users: TestUser[] = [];

  test.beforeAll(async () => {
    sessions = await createSessions(2, BASE_URL);
    const { runId, emailDomain, password } = generateTestCredentials({
      retry: 0,
      workerIndex: 0,
    });

    users = [];
    for (let i = 0; i < sessions.length; i++) {
      const username = `e2e_${runId}_h${i + 1}`;
      const email = `${username}@${emailDomain}`;
      const user = await createAccountViaUI(sessions[i].page, email, password, username);
      await signIn(sessions[i].page, email, password);
      users.push(user);
    }
  });

  test.afterAll(async () => {
    await deleteTestUsers(users);
    users = [];
    await destroySessions(sessions);
    sessions = [];
  });

  test("game library loads with cards", async () => {
    const page = sessions[0].page;

    // Should already be on /hub after sign-in
    await expect(page.getByText("Bright games for growing English skills")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("Game library")).toBeVisible();

    // Stat tiles — use title attributes to disambiguate
    await expect(page.getByText("Games ready")).toBeVisible();
    await expect(page.getByText("Learning styles")).toBeVisible();
    await expect(page.locator("span").filter({ hasText: /^Live$/ })).toBeVisible();

    // Game cards should be visible
    const gameCards = page.locator("article");
    const count = await gameCards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test("search filters game cards", async () => {
    const page = sessions[0].page;
    await page.goto("/hub");

    const searchInput = page.getByPlaceholder("Search games");

    // Search for a specific game
    await searchInput.fill("paint");
    // Should see paint-and-guess related content
    await expect(page.getByText(/scribble|paint/i).first()).toBeVisible({ timeout: 5_000 });

    // Search for something that doesn't exist
    await searchInput.fill("zzzxxxnonexistent");
    await expect(page.getByText("No games found")).toBeVisible({ timeout: 5_000 });

    // Clear search — all games return
    await searchInput.fill("");
    await expect(page.getByText("No games found")).not.toBeVisible({ timeout: 5_000 });
  });

  test("category buttons filter game cards", async () => {
    const page = sessions[0].page;
    await page.goto("/hub");

    // Click a category button
    const partyBtn = page.getByRole("button", { name: "Party" });
    if (await partyBtn.isVisible()) {
      await partyBtn.click();
      // Cards should still be visible (at least Keetdash is party)
      await expect(page.locator("article").first()).toBeVisible({ timeout: 5_000 });
    }

    // Click "All games" to reset
    const allBtn = page.getByRole("button", { name: "All games" });
    if (await allBtn.isVisible()) {
      await allBtn.click();
    }
  });

  test("sidebar navigation links work", async () => {
    const page = sessions[0].page;

    // Navigate to Leaderboard via sidebar link
    await page.getByRole("link", { name: "Leaderboard" }).click();
    await expect(page).toHaveURL(/\/hub\/leaderboard/, { timeout: 10_000 });
    await expect(page.getByText(/weekly ranking/i).first()).toBeVisible({
      timeout: 10_000,
    });

    // Navigate to Profile via sidebar link
    await page.getByRole("link", { name: "Profile" }).click();
    await expect(page).toHaveURL(/\/hub\/profile/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible({ timeout: 10_000 });

    // Back to Library via sidebar link
    await page.getByRole("link", { name: "Library" }).click();
    await expect(page).toHaveURL(/\/hub\/?$/, { timeout: 10_000 });
  });

  test("sidebar footer shows user email and sign-out", async () => {
    const page = sessions[0].page;
    await page.goto("/hub");

    // User email should be visible in sidebar
    await expect(page.getByText(users[0].email)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Signed in")).toBeVisible();

    // Sign out
    const signOutBtn = page.getByRole("button", { name: "Sign out" });
    await signOutBtn.click();

    // Should redirect to /auth
    await expect(page).toHaveURL(/\/auth/, { timeout: 15_000 });

    // Should not be able to access /hub
    await page.goto("/hub");
    await expect(page).toHaveURL(/\/auth/, { timeout: 15_000 });
  });

  test("landing page renders for unauthenticated users", async () => {
    // Use a fresh context since we just signed out
    const page = sessions[1].page;

    // Sign out first to ensure unauthenticated state
    await page.goto("/hub");
    // If we're already at /hub, we need to sign out
    const signOutBtn = page.getByRole("button", { name: "Sign out" });
    if (await signOutBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await signOutBtn.click();
      await expect(page).toHaveURL(/\/auth/, { timeout: 15_000 });
    }

    // Navigate to landing page
    await page.goto("/");

    // Hero section
    await expect(page.getByText(/learn.*play/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("link", { name: /play now|explore games/i }).first()).toBeVisible();

    // Game category grid
    await expect(page.getByText(/vocabulary|word/i).first()).toBeVisible({ timeout: 5_000 });

    // Scroll down — leaderboard preview may be below fold on mobile viewports
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(500);

    // Footer
    await expect(page.getByText(/primkeet/i).first()).toBeVisible();
  });

  test("landing page navbar links work for unauthenticated users", async () => {
    const page = sessions[1].page;
    await page.goto("/");

    // "Start playing" / "Play" button should link to /hub (redirects to /auth if not signed in)
    const playBtn = page.getByRole("link", { name: /play|start playing/i }).first();
    if (await playBtn.isVisible()) {
      await playBtn.click();
      await expect(page).toHaveURL(/\/(hub|auth)/, { timeout: 10_000 });
    }

    // "Sign in" button
    await page.goto("/");
    const signInLink = page.getByRole("link", { name: "Sign in" });
    if (await signInLink.isVisible()) {
      await signInLink.click();
      await expect(page).toHaveURL(/\/auth/, { timeout: 10_000 });
    }
  });
});
