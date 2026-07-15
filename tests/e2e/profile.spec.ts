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

test.describe("Profile & Avatar", () => {
  let session: Session | null = null;
  let user: TestUser | null = null;

  test.beforeAll(async () => {
    session = await createSession(
      { name: "profile-test", browser: "chromium", viewport: { width: 1440, height: 900 }, colorScheme: "light", locale: "en-US", deviceScaleFactor: 1, isMobile: false },
      BASE_URL,
    );
    const { runId, emailDomain, password } = generateTestCredentials({
      retry: 0,
      workerIndex: 0,
    });
    const username = `e2e_${runId}_prof`;
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

  test("profile page renders with user data", async () => {
    const page = session!.page;
    await page.goto("/hub/profile");

    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(user!.username, { exact: true })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Joined")).toBeVisible({ timeout: 5_000 });
  });

  test("username can be edited", async () => {
    const page = session!.page;
    await page.goto("/hub/profile");

    const usernameInput = page.locator("#username");
    await expect(usernameInput).toBeVisible({ timeout: 5_000 });

    const newUsername = `${user!.username}_v2`;
    await usernameInput.fill(newUsername);
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByText("Profile updated")).toBeVisible({ timeout: 10_000 });

    // Revert change
    await usernameInput.fill(user!.username);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Profile updated")).toBeVisible({ timeout: 10_000 });
  });

  test("avatar customizer dialog opens and has tabs", async () => {
    const page = session!.page;
    await page.goto("/hub/profile");

    // Click avatar preview to open customizer
    await page.locator("button").filter({ hasText: "Customize avatar" }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Customize Your Avatar")).toBeVisible();

    // Verify all 6 category tabs exist
    for (const tab of ["Skin", "Hair", "Clothes", "Accessories", "Face", "Style"]) {
      await expect(page.getByRole("tab", { name: tab })).toBeVisible();
    }

    // Click through each tab
    await page.getByRole("tab", { name: "Hair" }).click();
    await page.waitForTimeout(300);
    await page.getByRole("tab", { name: "Clothes" }).click();
    await page.waitForTimeout(300);
    await page.getByRole("tab", { name: "Accessories" }).click();
    await page.waitForTimeout(300);
    await page.getByRole("tab", { name: "Face" }).click();
    await page.waitForTimeout(300);
    await page.getByRole("tab", { name: "Style" }).click();
    await page.waitForTimeout(300);

    // Randomize button
    await page.getByRole("button", { name: "Randomize" }).click();

    // Save avatar
    await page.getByRole("button", { name: "Save Avatar" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Avatar saved successfully!")).toBeVisible({ timeout: 5_000 });
  });

  test("avatar customizer has reset functionality", async () => {
    const page = session!.page;
    await page.goto("/hub/profile");

    await page.locator("button").filter({ hasText: "Customize avatar" }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 });

    // Click Reset
    await page.getByRole("button", { name: "Reset" }).click();

    // Cancel (don't save)
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });
  });
});
