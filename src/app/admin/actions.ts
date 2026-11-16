"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { endSession, requireAdmin, startSession } from "@/lib/auth";
import { CATALOG_TAG } from "@/lib/catalog";
import { zonedInstant } from "@/lib/slots";
import { db } from "@/lib/db";
import { parseIntervals } from "@/lib/hours";
import { hashPassword, verifyPassword } from "@/lib/password";
import { randomBytes } from "node:crypto";

export type ActionState = { ok?: boolean; message?: string };

// ---------- Sign in / out ----------

/** Failed sign-in attempts per email, to slow down password guessing (per server instance). */
const failures = new Map<string, { count: number; until: number }>();
const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60_000;
let dummy: Promise<string> | null = null;
const dummyHash = () => (dummy ??= hashPassword(randomBytes(16).toString("hex")));

export async function login(_prev: ActionState, form: FormData): Promise<ActionState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "");

  const f = failures.get(email);
  if (f && f.count >= MAX_FAILURES && f.until > Date.now()) {
    return { message: "Too many attempts. Please try again in 15 minutes." };
  }

  const user = email ? await db.adminUser.findUnique({ where: { email } }) : null;
  // Always run a full hash check, so response time does not reveal whether the email exists.
  const valid = await verifyPassword(password, user?.passwordHash ?? (await dummyHash()));
  if (!user || !valid) {
    const count = (f && f.until > Date.now() ? f.count : 0) + 1;
    failures.set(email, { count, until: Date.now() + LOCK_MS });
    return { message: "Wrong email or password." };
  }

  failures.delete(email);
  await db.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await startSession(user.id);
  // Only allow redirects inside the admin area.
  redirect(next.startsWith("/admin/") && !next.startsWith("//") ? next : "/admin");
}

export async function logout() {
  await endSession();
  redirect("/admin/login");
}

// ---------- Bookings ----------

export async function adminCancelBooking(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return;
  await db.booking.updateMany({
    where: { id, status: "CONFIRMED" },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  revalidatePath("/admin");
}

// ---------- Services ----------

const ServiceForm = z.object({
  id: z.coerce.number().int().positive().optional(),
  nameEn: z.string().trim().min(2).max(60),
  nameDe: z.string().trim().min(2).max(60),
  descEn: z.string().trim().max(200).optional(),
  descDe: z.string().trim().max(200).optional(),
  durationMin: z.coerce.number().int().min(5).max(480),
  price: z.coerce.number().min(0).max(10_000),
  active: z.boolean(),
});

export async function saveService(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = ServiceForm.safeParse({
    id: form.get("id") || undefined,
    nameEn: form.get("nameEn"),
    nameDe: form.get("nameDe"),
    descEn: form.get("descEn") || undefined,
    descDe: form.get("descDe") || undefined,
    durationMin: form.get("durationMin"),
    price: String(form.get("price") ?? "").replace(",", "."),
    active: form.get("active") === "on",
  });
  if (!parsed.success) {
    return { message: `Please check: ${[...new Set(parsed.error.issues.map((i) => i.path[0]))].join(", ")}` };
  }
  const { id, price, ...rest } = parsed.data;
  const data = { ...rest, descEn: rest.descEn ?? null, descDe: rest.descDe ?? null, priceCents: Math.round(price * 100) };
  if (id) await db.service.update({ where: { id }, data });
  else await db.service.create({ data: { ...data, sortOrder: await db.service.count() } });

  updateTag(CATALOG_TAG);
  revalidatePath("/admin/services");
  return { ok: true, message: id ? "Saved." : "Service added." };
}

// ---------- Staff ----------

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export async function saveStaff(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = Number(form.get("id")) || null;
  const name = String(form.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 60) return { message: "Please enter a name (2–60 characters)." };

  const hours: { weekday: number; startMin: number; endMin: number }[] = [];
  for (const [weekday, key] of WEEKDAY_KEYS.entries()) {
    const parsed = parseIntervals(String(form.get(`hours_${key}`) ?? ""));
    if (!parsed.ok) return { message: `${key.toUpperCase()}: ${parsed.error}` };
    hours.push(...parsed.intervals.map((i) => ({ weekday, ...i })));
  }
  const serviceIds = form.getAll("serviceIds").map(Number).filter(Number.isInteger);

  const data = {
    name,
    titleEn: String(form.get("titleEn") ?? "").trim() || null,
    titleDe: String(form.get("titleDe") ?? "").trim() || null,
    active: form.get("active") === "on",
  };

  // One transaction: the schedule is never half-saved.
  const staffId = await db.$transaction(async (tx) => {
    const staff = id ? await tx.staff.update({ where: { id }, data }) : await tx.staff.create({ data });
    await tx.workingHours.deleteMany({ where: { staffId: staff.id } });
    await tx.workingHours.createMany({ data: hours.map((h) => ({ ...h, staffId: staff.id })) });
    await tx.staffService.deleteMany({ where: { staffId: staff.id } });
    await tx.staffService.createMany({ data: serviceIds.map((serviceId) => ({ serviceId, staffId: staff.id })) });
    return staff.id;
  });

  updateTag(CATALOG_TAG);
  revalidatePath("/admin/staff");
  if (!id) redirect(`/admin/staff/${staffId}?created=1`);
  return { ok: true, message: "Saved." };
}

const TimeOffForm = z.object({
  staffId: z.coerce.number().int().positive(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().trim().max(100).optional(),
});

/** Whole days off, from the start of `from` to the end of `to` in the business time zone. */
export async function addTimeOff(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = TimeOffForm.safeParse({
    staffId: form.get("staffId"),
    from: form.get("from"),
    to: form.get("to"),
    reason: form.get("reason") || undefined,
  });
  if (!parsed.success || parsed.data.to < parsed.data.from) return { message: "Please choose a valid date range." };
  const { staffId, from, to, reason } = parsed.data;

  const business = await db.business.findUniqueOrThrow({ where: { id: 1 } });
  const startsAt = zonedInstant(from, 0, business.timeZone);
  const endsAt = zonedInstant(to, 24 * 60, business.timeZone);
  if (!startsAt || !endsAt) return { message: "Please choose a valid date range." };

  const conflicts = await db.booking.count({
    where: { staffId, status: "CONFIRMED", startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
  });
  await db.timeOff.create({ data: { staffId, startsAt, endsAt, reason: reason ?? null } });
  revalidatePath(`/admin/staff/${staffId}`);
  return {
    ok: true,
    message:
      conflicts > 0
        ? `Time off added. Note: ${conflicts} existing booking(s) fall in this period. Check the schedule.`
        : "Time off added.",
  };
}

export async function deleteTimeOff(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  const staffId = Number(form.get("staffId"));
  if (!Number.isInteger(id)) return;
  await db.timeOff.delete({ where: { id } });
  revalidatePath(`/admin/staff/${staffId}`);
}
