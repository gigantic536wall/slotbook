import { db } from "./db";

/** How long personal data of past appointments is kept. */
export const RETENTION_DAYS = 365;

/** Replacement values: the row stays for statistics, but nothing identifies the person. */
const anonymousData = (id: number, now: Date) => ({
  customerName: "—",
  customerEmail: `deleted-${id}@invalid.example`,
  customerPhone: null,
  note: null,
  anonymizedAt: now,
});

/**
 * Erases personal data of one booking (GDPR Art. 17). An upcoming appointment is cancelled,
 * because nobody could be contacted about it any more.
 */
export async function anonymizeBooking(id: number, now = new Date()) {
  const booking = await db.booking.findUnique({ where: { id } });
  if (!booking || booking.anonymizedAt) return false;
  const upcoming = booking.status === "CONFIRMED" && booking.startsAt > now;
  await db.booking.update({
    where: { id },
    data: {
      ...anonymousData(id, now),
      ...(upcoming ? { status: "CANCELLED" as const, cancelledAt: now } : {}),
    },
  });
  return true;
}

/** Anonymizes all bookings whose appointment ended more than RETENTION_DAYS ago. */
export async function anonymizeExpired(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * 3600_000);
  const expired = await db.booking.findMany({
    where: { anonymizedAt: null, endsAt: { lt: cutoff } },
    select: { id: true },
  });
  for (const { id } of expired) await anonymizeBooking(id, now);
  return expired.length;
}
