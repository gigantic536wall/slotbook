import { beforeAll, describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";
import { decodeSession, encodeSession } from "./session-token";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-test-secret-test-secret-1234";
});

describe("password hashing", () => {
  it("accepts the right password and rejects a wrong one", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("uses a random salt", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });

  it("rejects malformed hashes", async () => {
    expect(await verifyPassword("x", "md5$abc")).toBe(false);
    expect(await verifyPassword("x", "")).toBe(false);
  });
});

describe("session token", () => {
  const future = Math.floor(Date.now() / 1000) + 3600;

  it("round-trips a valid token", () => {
    expect(decodeSession(encodeSession({ uid: 7, exp: future }))).toEqual({ uid: 7, exp: future });
  });

  it("rejects expired tokens", () => {
    expect(decodeSession(encodeSession({ uid: 7, exp: Math.floor(Date.now() / 1000) - 1 }))).toBeNull();
  });

  it("rejects a tampered payload", () => {
    const token = encodeSession({ uid: 7, exp: future });
    const [, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ uid: 1, exp: future })).toString("base64url");
    expect(decodeSession(`${forged}.${sig}`)).toBeNull();
  });

  it("rejects garbage", () => {
    expect(decodeSession(undefined)).toBeNull();
    expect(decodeSession("abc")).toBeNull();
    expect(decodeSession("a.b.c")).toBeNull();
  });
});
