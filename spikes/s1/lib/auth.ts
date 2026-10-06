import crypto from "node:crypto";

// Stateless HMAC session cookie (survives server restart); codes are in-memory
// (a restart just means requesting a fresh code). Spike-grade, not production.
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90-day sliding window
const STEPUP_WINDOW_MS = 10 * 60 * 1000;

type CodeEntry = { code: string; expiresAt: number };
const codes = new Map<string, CodeEntry>();

export function issueCode(email: string): string {
  const code = String(crypto.randomInt(100000, 999999));
  codes.set(email, { code, expiresAt: Date.now() + 10 * 60 * 1000 });
  return code;
}

export function checkCode(email: string, code: string): boolean {
  const entry = codes.get(email);
  if (!entry) return false;
  if (entry.expiresAt < Date.now() || entry.code !== code) return false;
  codes.delete(email);
  return true;
}

function sign(payload: string): string {
  const secret = process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production" && !secret) {
    throw new Error("AUTH_SECRET must be configured in production");
  }
  return crypto.createHmac("sha256", secret ?? "nilumi-s1-dev-secret").update(payload).digest("base64url");
}

export function createSessionToken(email: string, now = Date.now()): string {
  const payload = Buffer.from(
    JSON.stringify({ email, exp: now + SESSION_TTL_MS, authAt: now })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function refreshSessionAuthAt(token: string): string | null {
  const parsed = readSessionToken(token);
  if (!parsed) return null;
  return createSessionToken(parsed.email);
}

export function readSessionToken(
  token: string | undefined
): { email: string; exp: number; authAt: number } | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig || sign(payload) !== sig) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function needsStepUp(authAt: number): boolean {
  return Date.now() - authAt > STEPUP_WINDOW_MS;
}
