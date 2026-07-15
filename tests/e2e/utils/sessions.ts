import { chromium, firefox, type Browser, type BrowserContext, type Page } from "@playwright/test";

export type SessionConfig = {
  name: string;
  browser: "chromium" | "firefox";
  viewport: { width: number; height: number };
  colorScheme: "light" | "dark";
  locale: string;
  deviceScaleFactor: number;
  isMobile: boolean;
  reducedMotion?: "reduce";
  hasTouch?: boolean;
};

export type Session = {
  id: string;
  browser: Browser;
  context: BrowserContext;
  page: Page;
  config: SessionConfig;
};

const SESSION_PRESETS: SessionConfig[] = [
  {
    name: "desktop-chromium",
    browser: "chromium",
    viewport: { width: 1440, height: 900 },
    colorScheme: "light",
    locale: "en-US",
    deviceScaleFactor: 1,
    isMobile: false,
  },
  {
    name: "tablet-chromium",
    browser: "chromium",
    viewport: { width: 768, height: 1024 },
    colorScheme: "dark",
    locale: "en-US",
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  {
    name: "mobile-firefox",
    browser: "firefox",
    viewport: { width: 375, height: 812 },
    colorScheme: "light",
    locale: "es-MX",
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  },
  {
    name: "desktop-firefox",
    browser: "firefox",
    viewport: { width: 1280, height: 800 },
    colorScheme: "dark",
    locale: "en-US",
    deviceScaleFactor: 1,
    isMobile: false,
    reducedMotion: "reduce",
  },
  {
    name: "mobile-chromium",
    browser: "chromium",
    viewport: { width: 414, height: 896 },
    colorScheme: "light",
    locale: "en-US",
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
];

export function getSessionPresets(): SessionConfig[] {
  return [...SESSION_PRESETS];
}

export async function createSession(config: SessionConfig, baseURL: string): Promise<Session> {
  const launchBrowser = config.browser === "firefox" ? firefox : chromium;

  const browser = await launchBrowser.launch({
    headless: true,
  });

  const context = await browser.newContext({
    baseURL,
    viewport: config.viewport,
    colorScheme: config.colorScheme,
    locale: config.locale,
    deviceScaleFactor: config.deviceScaleFactor,
    reducedMotion: config.reducedMotion,
    ...(config.browser !== "firefox"
      ? { isMobile: config.isMobile, hasTouch: config.hasTouch }
      : {}),
  });

  const page = await context.newPage();
  const sessionId = `${config.name}-${Date.now().toString(36)}`;

  return { id: sessionId, browser, context, page, config };
}

export async function createSessions(
  count: number,
  baseURL: string,
): Promise<Session[]> {
  const configs = SESSION_PRESETS.slice(0, count);
  return Promise.all(configs.map((config) => createSession(config, baseURL)));
}

export async function destroySessions(sessions: Session[]): Promise<void> {
  await Promise.allSettled(
    sessions.map(async (session) => {
      await session.context.close().catch(() => {});
      await session.browser.close().catch(() => {});
    }),
  );
}
