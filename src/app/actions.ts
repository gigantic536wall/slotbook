"use server";

import { randomBytes } from "node:crypto";
import { z } from "zod";
import { getAvailability } from "@/lib/availability";
import { getCatalog } from "@/lib/catalog";
import { dayKey } from "@/lib/dates";
import { db } from "@/lib/db";

const BookingInput = z.object({
  serviceId: z.number().int().positive(),
  staffId: z.number().int().positive().nullable(),
  start: z.iso.datetime(),
  name: z.string().trim().min(2).max(80),
  email: z.email().max(120),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[+\d\s()/-]*$/)
    .optional()
    .transform((v) => v || null),
  note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => v || null),
  consent: z.boolean().refine((v) => v, "Consent is required"),
  locale: z.enum(["en", "de"]).default("en"),
  /** Honeypot: real users never fill this hidden field. */
  website: z.string().max(0).optional(),
});

export type BookingInput = z.input<typeof BookingInput>;

export type BookingResult =
  | { ok: true; token: string }
  | { ok: false; error: "invalid" | "slot_taken" | "unavailable"; fields?: string[] };

/** Exclusion-constraint violation from PostgreSQL: someone booked the same time a moment earlier. */
function isOverlapError(e: unknown): boolean {
  const text = `${e instanceof Error ? e.message : ""} ${JSON.stringify(e, Object.getOwnPropertyNames(e ?? {}))}`;
  return text.includes("Booking_no_overlap") || text.includes("23P01");
}

export async function createBooking(raw: BookingInput): Promise<BookingResult> {
  const parsed = BookingInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "invalid", fields: [...new Set(parsed.error.issues.map((i) => String(i.path[0])))] };
  }
  const input = parsed.data;
  const { business, services } = await getCatalog();
  const service = services.find((s) => s.id === input.serviceId);
  if (!service) return { ok: false, error: "invalid", fields: ["serviceId"] };

  // Never trust the client: check the slot against the current schedule.
  const start = new Date(input.start);
  const slots = await getAvailability({
    serviceId: input.serviceId,
    staffId: input.staffId,
    date: dayKey(start, business.timeZone),
  });
  const slot = slots.find((s) => new Date(s.start).getTime() === start.getTime());
  if (!slot) return { ok: false, error: "unavailable" };

  const end = new Date(start.getTime() + service.durationMin * 60_000);
  const token = randomBytes(24).toString("base64url");

  // With "any staff", fall back to the next free person if someone else was faster.
  for (const staffId of slot.staffIds) {
    try {
      await db.booking.create({
        data: {
          staffId,
          serviceId: service.id,
          startsAt: start,
          endsAt: end,
          priceCents: service.priceCents,
          customerName: input.name,
          customerEmail: input.email.toLowerCase(),
          customerPhone: input.phone,
          note: input.note,
          locale: input.locale,
          manageToken: token,
          consentAt: new Date(),
        },
      });
      return { ok: true, token };
    } catch (e) {
      if (isOverlapError(e)) continue;
      throw e;
    }
  }
  return { ok: false, error: "slot_taken" };
}

export type CancelResult = { ok: true } | { ok: false; error: "not_found" | "too_late" };

export async function cancelBooking(token: string): Promise<CancelResult> {
  if (typeof token !== "string" || token.length < 20 || token.length > 64) return { ok: false, error: "not_found" };
  const booking = await db.booking.findUnique({ where: { manageToken: token } });
  if (!booking || booking.status !== "CONFIRMED") return { ok: false, error: "not_found" };
  if (booking.startsAt.getTime() <= Date.now()) return { ok: false, error: "too_late" };

  await db.booking.update({
    where: { id: booking.id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  return { ok: true };
}
