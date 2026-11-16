import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stateless signed session token: base64url(JSON payload) + "." + HMAC-SHA256 signature.
 * Used by both the proxy (fast optimistic check) and server code (full check).
 */
export type SessionPayload = { uid: number; exp: number };

export const SESSION_COOKIE = "slotbook_session";
export const SESSION_TTL_SEC = 60 * 60 * 8; // one working day

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set (at least 32 characters)");
  return s;
}

const sign = (data: string) => createHmac("sha256", secret()).update(data).digest("base64url");

export function encodeSession(payload: SessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data)}`;
}

/** Returns the payload if the signature is valid and the token has not expired. */
export function decodeSession(token: string | undefined, now = Date.now()): SessionPayload | null {
  if (!token) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expected = Buffer.from(sign(data));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as SessionPayload;
    if (typeof payload.uid !== "number" || typeof payload.exp !== "number") return null;
    return payload.exp * 1000 > now ? payload : null;
  } catch {
    return null;
  }
}
