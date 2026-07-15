import type { Page } from "@playwright/test";
import type { Session, SessionConfig } from "./sessions";

export type LogEntry = {
  text: string;
  timestamp: number;
};

export type NetworkFailure = {
  url: string;
  status: number;
  method: string;
  timestamp: number;
};

export type SessionLog = {
  sessionId: string;
  config: SessionConfig;
  consoleErrors: LogEntry[];
  pageErrors: LogEntry[];
  networkFailures: NetworkFailure[];
  timings: Record<string, number>;
};

export function createSessionLog(session: Session): SessionLog {
  return {
    sessionId: session.id,
    config: session.config,
    consoleErrors: [],
    pageErrors: [],
    networkFailures: [],
    timings: {},
  };
}

export function attachLogCapture(page: Page, log: SessionLog): () => void {
  const onConsole = (message: { type: () => string; text: () => string }) => {
    if (message.type() === "error") {
      log.consoleErrors.push({ text: message.text(), timestamp: Date.now() });
    }
  };

  const onPageError = (error: Error) => {
    log.pageErrors.push({ text: error.message, timestamp: Date.now() });
  };

  const onResponse = (response: { status: () => number; url: () => string; request: () => { method: () => string } }) => {
    const status = response.status();
    if (status >= 400) {
      log.networkFailures.push({
        url: response.url(),
        status,
        method: response.request().method(),
        timestamp: Date.now(),
      });
    }
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("response", onResponse);

  return () => {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
    page.off("response", onResponse);
  };
}

export function recordTiming(log: SessionLog, key: string, startMs: number): void {
  log.timings[key] = Date.now() - startMs;
}

export function summarizeLogs(logs: SessionLog[]): string {
  const lines: string[] = [];
  lines.push("=".repeat(72));
  lines.push("SESSION LOG SUMMARY");
  lines.push("=".repeat(72));

  for (const log of logs) {
    const totalErrors = log.consoleErrors.length + log.pageErrors.length;
    const totalNetwork = log.networkFailures.length;
    const status = totalErrors === 0 && totalNetwork === 0 ? "CLEAN" : "ISSUES";

    lines.push("");
    lines.push(
      `[${log.config.name}] ${status} | ` +
        `console: ${log.consoleErrors.length} | ` +
        `page: ${log.pageErrors.length} | ` +
        `network: ${totalNetwork}`,
    );

    for (const err of log.consoleErrors) {
      lines.push(`  console.error: ${err.text.slice(0, 200)}`);
    }

    for (const err of log.pageErrors) {
      lines.push(`  page.error: ${err.text.slice(0, 200)}`);
    }

    for (const fail of log.networkFailures) {
      lines.push(`  network: ${fail.method} ${fail.url} → ${fail.status}`);
    }

    if (Object.keys(log.timings).length > 0) {
      lines.push("  timings:");
      for (const [key, ms] of Object.entries(log.timings)) {
        lines.push(`    ${key}: ${ms}ms`);
      }
    }
  }

  lines.push("");
  lines.push("=".repeat(72));
  return lines.join("\n");
}
