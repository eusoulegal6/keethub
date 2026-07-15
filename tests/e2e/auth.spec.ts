import { test, expect } from "@playwright/test";
import {
  createSession,
  createSessions,
  destroySessions,
  signIn,
  createAccountViaUI,
  deleteTestUsers,
  generateTestCredentials,
  BASE_URL,
} from "./utils";
import type { Session, TestUser } from "./utils";

test.describe("Authentication", () => {
  let sessions: Session[] = [];
  let createdUsers: TestUser[] = [];

  test.afterEach(async () => {
    await deleteTestUsers(createdUsers);
    createdUsers = [];
    await destroySessions(sessions);
    sessions = [];
  });

  test("sign-up form shows validation errors", async () => {
    sessions = await createSessions(1, BASE_URL);
    const page = sessions[0].page;

    await page.goto("/auth");

    // Switch to sign-up tab
    await page.getByRole("tab", { name: "Create account" }).click();
    await expect(page.getByRole("tab", { name: "Create account" })).toHaveAttribute(
      "data-state",
      "active",
    );

    // Submit empty form
    await page.getByRole("button", { name: "Create account" }).click();

    // Validation errors should appear
    await expect(page.getByText("Enter a valid email")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("At least 6 characters")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("At least 3 characters")).toBeVisible({ timeout: 5_000 });

    // Invalid username formats
    await page.locator("#signup-username").fill("BAD USERNAME");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("lowercase letters, numbers, underscores")).toBeVisible({
      timeout: 5_000,
    });

    // Too short username
    await page.locator("#signup-username").fill("ab");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("At least 3 characters")).toBeVisible({ timeout: 5_000 });

    // Invalid email
    await page.locator("#signup-username").fill("valid_user");
    await page.locator("#signup-email").fill("not-an-email");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Enter a valid email")).toBeVisible({ timeout: 5_000 });

    // Short password
    await page.locator("#signup-email").fill("test@example.com");
    await page.locator("#signup-password").fill("12345");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("At least 6 characters")).toBeVisible({ timeout: 5_000 });
  });

  test("sign-up and sign-in via UI", async () => {
    sessions = await createSessions(2, BASE_URL);
    const { runId, emailDomain, password } = generateTestCredentials({
      retry: test.info().retry,
      workerIndex: test.info().workerIndex,
    });

    for (let i = 0; i < sessions.length; i++) {
      const page = sessions[i].page;
      const username = `e2e_${runId}_a${i + 1}`;
      const email = `${username}@${emailDomain}`;

      // Create account via real UI
      const user = await createAccountViaUI(page, email, password, username);
      createdUsers.push(user);

      // Sign in with the new account
      await signIn(page, email, password);

      // Verify we're on the hub
      await expect(page).toHaveURL(/\/hub(?:\/)?/, { timeout: 15_000 });
      await expect(page.getByText("Bright games for growing English skills")).toBeVisible({
        timeout: 10_000,
      });

      console.log(`[auth] Session ${sessions[i].config.name}: sign-up + sign-in OK`);
    }
  });

  test("sign-in with wrong password shows error", async () => {
    sessions = await createSessions(1, BASE_URL);
    const page = sessions[0].page;
    const { runId, emailDomain, password } = generateTestCredentials({
      retry: test.info().retry,
      workerIndex: test.info().workerIndex,
    });

    const username = `e2e_${runId}_wrong`;
    const email = `${username}@${emailDomain}`;
    const user = await createAccountViaUI(page, email, password, username);
    createdUsers.push(user);

    // Now try signing in with wrong password. Page should be on sign-in tab already.
    await page.locator("#signin-email").fill(email);
    await page.locator("#signin-password").fill("wrong-password!!");
    await page.getByRole("button", { name: "Sign in" }).click();

    // Should see an error toast
    await expect(page.getByText(/invalid/i)).toBeVisible({ timeout: 10_000 });
  });

  test("tab switching between sign-in and sign-up", async () => {
    sessions = await createSessions(1, BASE_URL);
    const page = sessions[0].page;

    await page.goto("/auth");

    // Default should be sign-in
    await expect(page.getByRole("tab", { name: "Sign in" })).toHaveAttribute(
      "data-state",
      "active",
    );

    // Switch to sign-up
    await page.getByRole("tab", { name: "Create account" }).click();
    await expect(page.getByRole("tab", { name: "Create account" })).toHaveAttribute(
      "data-state",
      "active",
    );
    await expect(page.locator("#signup-username")).toBeVisible();

    // Switch back to sign-in
    await page.getByRole("tab", { name: "Sign in" }).click();
    await expect(page.getByRole("tab", { name: "Sign in" })).toHaveAttribute(
      "data-state",
      "active",
    );
    await expect(page.locator("#signin-email")).toBeVisible();
  });

  test("Google OAuth button is present", async () => {
    sessions = await createSessions(1, BASE_URL);
    const page = sessions[0].page;

    await page.goto("/auth");
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  });
});
