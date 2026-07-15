export const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ?? "https://keethub.lovable.app";

export { createSession, createSessions, destroySessions, getSessionPresets } from "./sessions";
export type { Session, SessionConfig } from "./sessions";

export {
  signIn,
  createAccountViaUI,
  createAccountsForSessions,
  signInSessions,
  deleteTestUsers,
  generateTestCredentials,
  getAdminClient,
} from "./auth";
export type { TestUser } from "./auth";

export {
  createSessionLog,
  attachLogCapture,
  recordTiming,
  summarizeLogs,
} from "./logs";
export type { SessionLog, LogEntry, NetworkFailure } from "./logs";
