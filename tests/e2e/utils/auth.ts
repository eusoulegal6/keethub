import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Session } from "./sessions";

export type TestUser = {
  id: string;
  email: string;
  username: string;
};

let _adminClient: ReturnType<typeof createSupabaseAdmin> | undefined;

function createSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      `Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. The e2e tests need the service role key.`,
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getAdminClient() {
  if (!_adminClient) {
    _adminClient = createSupabaseAdmin();
  }
  return _adminClient;
}

export async function deleteTestUsers(users: TestUser[]): Promise<void> {
  if (users.length === 0 || process.env.E2E_KEEP_CREATED_USERS === "1") return;
  const admin = getAdminClient();

  const results = await Promise.allSettled(
    users
      .filter((u) => u.id) // Skip users without IDs (e.g. service role key missing)
      .map((user) => admin.auth.admin.deleteUser(user.id)),
  );

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "rejected") {
      console.warn(`Failed to delete e2e user:`, result.reason);
    }
  }
}

export function generateTestCredentials(testInfo: { retry: number; workerIndex: number }) {
  const runId = `${Date.now().toString(36)}${testInfo.workerIndex}${testInfo.retry}`;
  const emailDomain = process.env.E2E_ACCOUNT_EMAIL_DOMAIN ?? "example.com";
  const password = process.env.E2E_PLAYER_PASSWORD ?? `E2e-${runId}-Password!`;

  return { runId, emailDomain, password };
}

export async function signIn(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  const currentUrl = page.url();
  if (!currentUrl.includes("/auth")) {
    await page.goto("/auth");
  }

  const signinTab = page.getByRole("tab", { name: "Sign in" });
  try {
    const state = await signinTab.getAttribute("data-state");
    if (state !== "active") {
      await signinTab.click();
      await page.waitForTimeout(300);
    }
  } catch {
    // Tab may not exist if already on sign-in, just proceed
  }

  const emailInput = page.locator("#signin-email");
  await expect(emailInput).toBeVisible({ timeout: 10_000 });
  await emailInput.fill(email);
  await page.locator("#signin-password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/hub(?:\/)?/, { timeout: 30_000 });
}

export async function createAccountViaUI(
  page: Page,
  email: string,
  password: string,
  username: string,
): Promise<TestUser> {
  await page.goto("/auth");

  const signupTab = page.getByRole("tab", { name: "Create account" });
  const isActive = (await signupTab.getAttribute("data-state")) === "active";
  if (!isActive) {
    await signupTab.click();
  }

  await page.waitForTimeout(300);

  await page.locator("#signup-username").fill(username);
  await page.locator("#signup-email").fill(email);
  await page.locator("#signup-password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  // Wait for sign-up success: either the toast or redirection to /hub
  const toastOrRedirect = Promise.race([
    page.waitForURL(/\/hub(?:\/)?/, { timeout: 20_000 }).then(() => true),
    expect(page.getByText("Account created - you can sign in now")).toBeVisible({
      timeout: 20_000,
    }).then(() => true),
  ]).catch(() => false);

  if (!toastOrRedirect) {
    // If neither toast nor redirect, check if we're already on the sign-in tab
    // (account may have been created but toast already dismissed)
    const bodyText = await page.locator("body").innerText().catch(() => "");
    if (!/sign in|create account/i.test(bodyText)) {
      throw new Error("Sign-up did not complete — no toast and not on auth page");
    }
  }

  // Look up the user via Admin API to get their Supabase ID
  const admin = getAdminClient();
  let userId = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 500));
    const { data } = await admin.auth.admin.listUsers();
    const found = data?.users?.find((u) => u.email === email);
    if (found?.id) {
      userId = found.id;
      break;
    }
  }

  return { id: userId, email, username };
}

export async function createAccountsForSessions(
  sessions: Session[],
  testInfo: { retry: number; workerIndex: number },
): Promise<TestUser[]> {
  const { runId, emailDomain, password } = generateTestCredentials(testInfo);
  const users: TestUser[] = [];

  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];
    const username = `e2e_${runId}_${i + 1}`;
    const email = `${username}@${emailDomain}`;

    const user = await createAccountViaUI(session.page, email, password, username);
    users.push(user);

    console.log(`[auth] Created account: ${username} (${session.config.name})`);
  }

  return users;
}

export async function signInSessions(
  sessions: Session[],
  users: TestUser[],
  password: string,
): Promise<void> {
  for (let i = 0; i < sessions.length; i++) {
    await signIn(sessions[i].page, users[i].email, password);
  }
}
