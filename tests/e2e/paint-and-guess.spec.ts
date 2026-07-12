import {
  test,
  expect,
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const PLAYER_COUNT = 5;
const PIN_PATTERN = /^[A-Z0-9]{6}$/;

type TestUser = {
  id: string;
  email: string;
  username: string;
};

type TestRoom = {
  id: string;
  gamePin: string;
};

type SupabaseTestAdmin = ReturnType<typeof createSupabaseTestAdmin>;

test("five players can create, join and play a Paint & Guess round", async ({}, testInfo) => {
  const browsers: Browser[] = [];
  const contexts: BrowserContext[] = [];
  const pages: Page[] = [];
  let admin: SupabaseTestAdmin | undefined;
  const users: TestUser[] = [];
  const password = readTestPassword(testInfo);
  const headless = testInfo.project.use.headless !== false;
  const baseURL =
    typeof testInfo.project.use.baseURL === "string"
      ? testInfo.project.use.baseURL
      : (process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5173");

  try {
    admin = createSupabaseTestAdmin();
    users.push(...(await createTestUsers(admin, password, testInfo)));

    for (let index = 0; index < PLAYER_COUNT; index++) {
      const browser = await chromium.launch({ headless });
      const context = await browser.newContext({
        baseURL,
        viewport: { width: 1440, height: 1000 },
      });
      const page = await context.newPage();

      page.on("console", (message) => {
        if (message.type() === "error") {
          console.error(`[Player ${index + 1}] console error:`, message.text());
        }
      });

      page.on("pageerror", (error) => {
        console.error(`[Player ${index + 1}] page error:`, error);
      });

      browsers.push(browser);
      contexts.push(context);
      pages.push(page);
    }

    await Promise.all(pages.map((page, index) => signIn(page, users[index].email, password)));

    await Promise.all(pages.map(openPaintAndGuess));

    const usernames = await Promise.all(pages.map(readPlayerName));
    expect(new Set(usernames).size).toBe(PLAYER_COUNT);

    const host = pages[0];
    const roomName = `e2e-${Date.now()}`;
    await host.getByPlaceholder("Room name").fill(roomName);
    await host.getByRole("button", { name: "Create Room" }).click();

    const room = await readCreatedRoom(admin, roomName, users[0].id);
    const gamePin = room.gamePin;
    expect(gamePin).toMatch(PIN_PATTERN);
    await expectRoomHeader(host, room.id);
    await expect(host.getByText("Players (1)")).toBeVisible();

    for (let index = 1; index < PLAYER_COUNT; index++) {
      const guest = pages[index];
      await guest.getByPlaceholder("Enter 6-letter PIN").fill(gamePin);
      await guest.getByRole("button", { name: "Join Room" }).click();
      await expectRoomHeader(guest, room.id);
      await expect(host.getByText(`Players (${index + 1})`)).toBeVisible();
    }

    await Promise.all(pages.map((page) => expectFivePlayers(page, usernames, room.id)));

    for (const page of pages) {
      await page.getByRole("button", { name: "Ready Up" }).click();
    }

    await Promise.all(pages.map(expectAllPlayersReady));
    await expect(host.getByRole("button", { name: "Start Game" })).toBeEnabled();

    for (const guest of pages.slice(1)) {
      await expect(guest.getByRole("button", { name: "Start Game" })).toHaveCount(0);
      await expect(guest.getByText(/Waiting for host to start/i)).toBeVisible();
    }

    await host.getByRole("button", { name: "Start Game" }).click();
    await expectRoundOnAll(pages, 1);

    const drawerIndex = await findSingleDrawerIndex(pages);
    const drawerPage = pages[drawerIndex];
    const guesserPages = pages.filter((_, index) => index !== drawerIndex);

    const secretWord = normalizeWord(await readVisibleDrawerWord(drawerPage));
    expect(secretWord.length).toBeGreaterThan(0);

    for (const guesser of guesserPages) {
      await expect.poll(async () => readVisibleDrawerWord(guesser)).toBe("");
      await expect(guesser.getByText(secretWord, { exact: true })).toHaveCount(0);
    }

    const beforeDrawing = await Promise.all(guesserPages.map(readCanvasData));
    await drawStroke(drawerPage);

    await expect
      .poll(
        async () => {
          const afterDrawing = await Promise.all(guesserPages.map(readCanvasData));
          return afterDrawing.filter((data, index) => data !== beforeDrawing[index]).length;
        },
        {
          message: "drawing should reach all four guessers",
          timeout: 30_000,
        },
      )
      .toBe(PLAYER_COUNT - 1);

    for (let index = 0; index < guesserPages.length; index++) {
      await submitCorrectGuess(guesserPages[index], secretWord, 1);

      if (index < guesserPages.length - 1) {
        await expectRoundOnAll(pages, 1);
      }
    }

    await expectRoundOnAll(pages, 2, 45_000);

    const nextDrawerIndex = await findSingleDrawerIndex(pages);
    const nextGuesserPages = pages.filter((_, index) => index !== nextDrawerIndex);
    for (const guesser of nextGuesserPages) {
      await expect.poll(async () => readVisibleDrawerWord(guesser)).toBe("");
    }
  } finally {
    await Promise.allSettled(contexts.map((context) => context.close()));
    await Promise.allSettled(browsers.map((browser) => browser.close()));
    await deleteTestUsers(admin, users);
  }
});

function createSupabaseTestAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    const missing = [
      ...(!supabaseUrl ? ["SUPABASE_URL"] : []),
      ...(!serviceRoleKey ? ["SUPABASE_SERVICE_ROLE_KEY"] : []),
    ];
    throw new Error(
      `Missing ${missing.join(", ")}. The e2e test creates temporary Supabase users with the service role key.`,
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    global: {
      fetch: createSupabaseFetch(serviceRoleKey),
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function createTestUsers(
  admin: SupabaseTestAdmin,
  password: string,
  testInfo: { retry: number; workerIndex: number },
): Promise<TestUser[]> {
  const emailDomain = readEmailDomain();
  const runId = createRunId(testInfo);
  const users: TestUser[] = [];

  for (let index = 0; index < PLAYER_COUNT; index++) {
    const username = `e2e_${runId}_${index + 1}`;
    const email = `${username}@${emailDomain}`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username },
    });

    if (error) {
      throw new Error(`Failed to create e2e user ${email}: ${error.message}`);
    }

    if (!data.user?.id) {
      throw new Error(`Supabase did not return a user id for ${email}.`);
    }

    users.push({ id: data.user.id, email, username });
  }

  return users;
}

async function deleteTestUsers(
  admin: SupabaseTestAdmin | undefined,
  users: TestUser[],
): Promise<void> {
  if (!admin || users.length === 0 || process.env.E2E_KEEP_CREATED_USERS === "1") {
    return;
  }

  const results = await Promise.allSettled(
    users.map((user) => admin.auth.admin.deleteUser(user.id)),
  );

  for (let index = 0; index < results.length; index++) {
    const result = results[index];
    if (result.status === "rejected") {
      console.warn(`Failed to delete e2e user ${users[index].email}:`, result.reason);
    } else if (result.value.error) {
      console.warn(
        `Failed to delete e2e user ${users[index].email}: ${result.value.error.message}`,
      );
    }
  }
}

function readTestPassword(testInfo: { retry: number; workerIndex: number }): string {
  const password = process.env.E2E_PLAYER_PASSWORD ?? `E2e-${createRunId(testInfo)}-Password!`;

  if (password.length < 6) {
    throw new Error("E2E_PLAYER_PASSWORD must be at least 6 characters.");
  }

  return password;
}

function readEmailDomain(): string {
  const emailDomain = process.env.E2E_ACCOUNT_EMAIL_DOMAIN ?? "example.com";

  if (emailDomain.includes("@") || !emailDomain.includes(".")) {
    throw new Error("E2E_ACCOUNT_EMAIL_DOMAIN must be a domain, for example example.com.");
  }

  return emailDomain;
}

function createRunId(testInfo: { retry: number; workerIndex: number }): string {
  return `${Date.now().toString(36)}${testInfo.workerIndex}${testInfo.retry}`;
}

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/auth");

  const emailInput = page.getByLabel("Email").first();
  if (await emailInput.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await emailInput.fill(email);
    await page.getByLabel("Password").first().fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
  }

  await expect(page).toHaveURL(/\/hub(?:\/)?/, { timeout: 30_000 });
}

async function readCreatedRoom(
  admin: SupabaseTestAdmin,
  roomName: string,
  ownerId: string,
): Promise<TestRoom> {
  let room: TestRoom | null = null;

  await expect
    .poll(
      async () => {
        const { data, error } = await admin
          .from("game_rooms")
          .select("id, game_pin")
          .eq("name", roomName)
          .eq("owner_id", ownerId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          throw new Error(`Failed to read created room: ${error.message}`);
        }

        if (data?.id && data?.game_pin) {
          room = { id: data.id, gamePin: data.game_pin };
        }

        return data?.game_pin ?? "";
      },
      { message: "created room PIN should be persisted" },
    )
    .toMatch(PIN_PATTERN);

  if (!room) {
    throw new Error("Created room was not returned from Supabase.");
  }

  return room;
}

async function openPaintAndGuess(page: Page): Promise<void> {
  await page.goto("/hub/games/paint-and-guess");
  await expect(page.getByText("Multiplayer Draw & Guess")).toBeVisible();
}

async function readPlayerName(page: Page): Promise<string> {
  const input = page.getByPlaceholder("Enter your name");
  await expect(input).toBeVisible();

  await expect
    .poll(async () => (await input.inputValue()).trim(), {
      message: "profile username should populate the player name field",
    })
    .not.toBe("");

  return (await input.inputValue()).trim();
}

async function expectRoomHeader(page: Page, roomId: string): Promise<void> {
  await expect(page.getByText(new RegExp(`Room:\\s*${escapeRegExp(roomId)}`))).toBeVisible();
}

async function expectFivePlayers(page: Page, usernames: string[], roomId: string): Promise<void> {
  await expect(page.getByText("Players (5)")).toBeVisible();
  await expectRoomHeader(page, roomId);

  for (const username of usernames) {
    await expect(page.getByText(username, { exact: false }).first()).toBeVisible();
  }
}

async function expectAllPlayersReady(page: Page): Promise<void> {
  await expect
    .poll(async () => page.getByText("Ready", { exact: true }).count(), {
      message: "all five players should show Ready",
    })
    .toBe(PLAYER_COUNT);
}

async function expectRoundOnAll(pages: Page[], round: number, timeout = 30_000): Promise<void> {
  await Promise.all(
    pages.map(async (page) => {
      await expect(page.getByText(new RegExp(`Round\\s+${round}\\s*/\\s*\\d+`))).toBeVisible({
        timeout,
      });
      await expect(page.getByText(/\d+:\d{2}/)).toBeVisible({ timeout });
    }),
  );
}

async function findSingleDrawerIndex(pages: Page[]): Promise<number> {
  let drawerIndex = -1;

  await expect
    .poll(
      async () => {
        const visibleIndexes: number[] = [];

        for (let index = 0; index < pages.length; index++) {
          const visible = (await readVisibleDrawerWord(pages[index])) !== "";

          if (visible) visibleIndexes.push(index);
        }

        if (visibleIndexes.length === 1) {
          drawerIndex = visibleIndexes[0];
        }

        return visibleIndexes.length;
      },
      {
        message: "exactly one browser should see the drawer word",
        timeout: 30_000,
      },
    )
    .toBe(1);

  return drawerIndex;
}

async function readVisibleDrawerWord(page: Page): Promise<string> {
  const bodyText = await page
    .locator("body")
    .innerText()
    .catch(() => "");
  const match = bodyText.match(/Your word:\s*([A-Z][A-Z -]*)/);
  return normalizeText(match?.[1] ?? "");
}

async function readCanvasData(page: Page): Promise<string> {
  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible();

  return canvas.evaluate((element) => {
    const root = element instanceof HTMLCanvasElement ? element.parentElement : element;
    const canvases = Array.from(root?.querySelectorAll("canvas") ?? []).filter(
      (canvas): canvas is HTMLCanvasElement =>
        canvas instanceof HTMLCanvasElement &&
        canvas.offsetWidth > 0 &&
        canvas.offsetHeight > 0 &&
        canvas.width > 0 &&
        canvas.height > 0,
    );

    if (canvases.length === 0) {
      throw new Error("No rendered drawing canvas found");
    }

    const [firstCanvas] = canvases;
    const composite = document.createElement("canvas");
    composite.width = firstCanvas.width;
    composite.height = firstCanvas.height;

    const context = composite.getContext("2d");
    if (!context) {
      throw new Error("Unable to read drawing canvas");
    }

    for (const canvas of canvases) {
      context.drawImage(canvas, 0, 0, composite.width, composite.height);
    }

    return composite.toDataURL();
  });
}

async function drawStroke(page: Page): Promise<void> {
  const interactiveCanvas = page.locator("canvas").last();
  await expect(interactiveCanvas).toBeVisible();

  const box = await interactiveCanvas.boundingBox();
  if (!box) {
    throw new Error("Drawing canvas has no bounding box");
  }

  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.35);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.55, {
    steps: 8,
  });
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.35, {
    steps: 8,
  });
  await page.mouse.up();
}

async function submitCorrectGuess(
  page: Page,
  secretWord: string,
  currentRound: number,
): Promise<void> {
  const input = page.getByPlaceholder("Type your guess...");
  await expect(input).toBeVisible();
  await input.fill(secretWord);
  await input.press("Enter");

  await expect
    .poll(
      async () => {
        const value = await input.inputValue().catch(() => null);
        const correctVisible = await page
          .getByText("Correct!", { exact: true })
          .isVisible()
          .catch(() => false);
        const bodyText = await page
          .locator("body")
          .innerText()
          .catch(() => "");
        const advanced = new RegExp(`Round\\s+${currentRound + 1}\\s*/\\s*\\d+`).test(bodyText);

        return value === "" || correctVisible || advanced;
      },
      {
        message: "correct guess should be accepted",
        timeout: 15_000,
      },
    )
    .toBe(true);
}

function normalizeWord(value: string | null): string {
  return normalizeText(value);
}

function normalizeText(value: string | null): string {
  return (value ?? "").trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
