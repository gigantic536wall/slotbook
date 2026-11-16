import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { db } from "./db";
import { decodeSession, encodeSession, SESSION_COOKIE, SESSION_TTL_SEC } from "./session-token";

export type Admin = { id: number; email: string; name: string };

export async function startSession(uid: number) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
  (await cookies()).set(SESSION_COOKIE, encodeSession({ uid, exp }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SEC,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** The signed-in admin, checked against the database (a deleted user loses access at once). */
export async function getAdmin(): Promise<Admin | null> {
  // The expiry check reads the clock, so it must run at request time, never during prerendering.
  await connection();
  const payload = decodeSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!payload) return null;
  return db.adminUser.findUnique({ where: { id: payload.uid }, select: { id: true, email: true, name: true } });
}

/** Use at the top of every admin page and admin Server Action. */
export async function requireAdmin(): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
