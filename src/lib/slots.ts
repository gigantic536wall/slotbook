import { TZDate } from "@date-fns/tz";
import { addDays } from "./dates";

/** A working interval in minutes from local midnight, e.g. 09:00–13:00 = { startMin: 540, endMin: 780 }. */
export type DayInterval = { startMin: number; endMin: number };

/** A time range that is already taken (booking, time off). */
export type BusyRange = { start: Date; end: Date };

export type SlotInput = {
  /** Calendar day in the business time zone, "YYYY-MM-DD". */
  date: string;
  timeZone: string;
  durationMin: number;
  stepMin: number;
  /** Working intervals of the staff member for this weekday. */
  intervals: DayInterval[];
  busy: BusyRange[];
  now: Date;
  /** Customers can't book closer than this to the current time. */
  minLeadMin?: number;
};

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDay(date: string): { y: number; m: number; d: number } {
  const match = DATE_RE.exec(date);
  if (!match) throw new Error(`Invalid date: ${date}`);
  const [, y, m, d] = match.map(Number);
  return { y, m, d };
}

/** Weekday (0 = Sunday) of a calendar day. Independent of time zones. */
export function weekdayOf(date: string): number {
  const { y, m, d } = parseDay(date);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * The instant at the given wall-clock time in the time zone, or null if that
 * wall-clock time does not exist on that day (spring-forward DST gap).
 */
export function zonedInstant(date: string, minutes: number, timeZone: string): Date | null {
  // 24:00 (and later) belongs to the next calendar day.
  if (minutes >= 24 * 60) return zonedInstant(addDays(date, Math.floor(minutes / 1440)), minutes % 1440, timeZone);
  const { y, m, d } = parseDay(date);
  const h = Math.floor(minutes / 60);
  const min = minutes % 60;
  const t = new TZDate(y, m - 1, d, h, min, 0, 0, timeZone);
  if (t.getFullYear() !== y || t.getMonth() !== m - 1 || t.getDate() !== d || t.getHours() !== h || t.getMinutes() !== min) {
    return null;
  }
  return new Date(t.getTime());
}

const overlaps = (aStart: number, aEnd: number, b: BusyRange) => aStart < b.end.getTime() && b.start.getTime() < aEnd;

/** All start times on the given day when a service of `durationMin` fits into the schedule. */
export function computeSlots(input: SlotInput): Date[] {
  const { date, timeZone, durationMin, stepMin, intervals, busy, now, minLeadMin = 0 } = input;
  if (durationMin <= 0 || stepMin <= 0) throw new Error("durationMin and stepMin must be positive");

  const earliest = now.getTime() + minLeadMin * 60_000;
  const result: Date[] = [];
  const seen = new Set<number>();

  for (const { startMin, endMin } of [...intervals].sort((a, b) => a.startMin - b.startMin)) {
    const close = zonedInstant(date, endMin, timeZone);
    if (!close) continue;
    for (let m = startMin; m + durationMin <= endMin; m += stepMin) {
      const start = zonedInstant(date, m, timeZone);
      if (!start) continue; // wall-clock time skipped by DST
      const s = start.getTime();
      // Real elapsed time, so a slot crossing a DST change still lasts durationMin.
      const e = s + durationMin * 60_000;
      if (e > close.getTime()) continue;
      if (s < earliest || seen.has(s)) continue;
      if (busy.some((b) => overlaps(s, e, b))) continue;
      seen.add(s);
      result.push(start);
    }
  }
  return result.sort((a, b) => a.getTime() - b.getTime());
}
