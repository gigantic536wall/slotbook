import "server-only";
import { getCatalog } from "./catalog";
import { addDays, dayKey } from "./dates";
import { db } from "./db";
import { computeSlots, weekdayOf } from "./slots";

/** Customers can't book a slot that starts in less than this many minutes. */
export const MIN_LEAD_MIN = 60;

export type AvailableSlot = {
  /** ISO start time (UTC). */
  start: string;
  /** Staff members who are free at this time, in order of preference. */
  staffIds: number[];
};

export class AvailabilityError extends Error {}

/**
 * Free start times for a service on a day, for one staff member or for anyone
 * who offers the service. Always reads bookings fresh from the database.
 */
export async function getAvailability(params: {
  serviceId: number;
  staffId: number | null;
  date: string;
  now?: Date;
}): Promise<AvailableSlot[]> {
  const { serviceId, staffId, date } = params;
  const now = params.now ?? new Date();
  const { business, services, staff } = await getCatalog();

  const service = services.find((s) => s.id === serviceId);
  if (!service) throw new AvailabilityError("Unknown service");

  const today = dayKey(now, business.timeZone);
  const lastDay = addDays(today, business.bookingDays - 1);
  if (date < today || date > lastDay) return [];

  const candidates = staff.filter((p) => p.serviceIds.includes(serviceId) && (staffId === null || p.id === staffId));
  if (staffId !== null && candidates.length === 0) throw new AvailabilityError("This staff member does not offer the service");
  if (candidates.length === 0) return [];

  // Load everything that can block time on this day (with a margin for time zones).
  const from = new Date(`${addDays(date, -1)}T00:00:00Z`);
  const to = new Date(`${addDays(date, 2)}T00:00:00Z`);
  const ids = candidates.map((p) => p.id);
  const [bookings, timeOff] = await Promise.all([
    db.booking.findMany({
      where: { staffId: { in: ids }, status: "CONFIRMED", startsAt: { lt: to }, endsAt: { gt: from } },
      select: { staffId: true, startsAt: true, endsAt: true },
    }),
    db.timeOff.findMany({
      where: { staffId: { in: ids }, startsAt: { lt: to }, endsAt: { gt: from } },
      select: { staffId: true, startsAt: true, endsAt: true },
    }),
  ]);

  const weekday = weekdayOf(date);
  const byTime = new Map<number, number[]>();

  for (const person of candidates) {
    const busy = [...bookings, ...timeOff]
      .filter((b) => b.staffId === person.id)
      .map((b) => ({ start: b.startsAt, end: b.endsAt }));
    const slots = computeSlots({
      date,
      timeZone: business.timeZone,
      durationMin: service.durationMin,
      stepMin: business.slotStepMin,
      intervals: person.hours.filter((h) => h.weekday === weekday),
      busy,
      now,
      minLeadMin: MIN_LEAD_MIN,
    });
    for (const slot of slots) {
      const key = slot.getTime();
      byTime.set(key, [...(byTime.get(key) ?? []), person.id]);
    }
  }

  return [...byTime.entries()]
    .sort(([a], [b]) => a - b)
    .map(([time, staffIds]) => ({ start: new Date(time).toISOString(), staffIds }));
}
