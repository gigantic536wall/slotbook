import { describe, expect, it } from "vitest";
import { computeSlots, weekdayOf, zonedInstant } from "./slots";

const TZ = "Europe/Berlin";
const at = (iso: string) => new Date(iso);
const times = (slots: Date[]) =>
  slots.map((s) => s.toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }));

const base = {
  date: "2026-12-01", // Tuesday, CET (UTC+1)
  timeZone: TZ,
  durationMin: 60,
  stepMin: 30,
  intervals: [{ startMin: 9 * 60, endMin: 12 * 60 }],
  busy: [],
  now: at("2026-11-01T00:00:00Z"),
};

describe("weekdayOf", () => {
  it("returns 0 for Sunday and 2 for Tuesday", () => {
    expect(weekdayOf("2026-11-29")).toBe(0);
    expect(weekdayOf("2026-12-01")).toBe(2);
  });
});

describe("zonedInstant", () => {
  it("converts Berlin wall-clock time to UTC", () => {
    expect(zonedInstant("2026-12-01", 9 * 60, TZ)?.toISOString()).toBe("2026-12-01T08:00:00.000Z");
    expect(zonedInstant("2026-07-01", 9 * 60, TZ)?.toISOString()).toBe("2026-07-01T07:00:00.000Z");
  });

  it("returns null for a time skipped by DST", () => {
    // 29 March 2026: clocks jump from 02:00 to 03:00 in Berlin.
    expect(zonedInstant("2026-03-29", 2 * 60 + 30, TZ)).toBeNull();
  });
});

describe("computeSlots", () => {
  it("fills the working interval with the given step", () => {
    expect(times(computeSlots(base))).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00"]);
  });

  it("does not offer a slot that would end after closing time", () => {
    const slots = computeSlots({ ...base, durationMin: 90 });
    expect(times(slots)).toEqual(["09:00", "09:30", "10:00", "10:30"]);
  });

  it("skips slots overlapping existing bookings, but allows back-to-back", () => {
    const busy = [{ start: at("2026-12-01T09:00:00Z"), end: at("2026-12-01T10:00:00Z") }]; // 10:00–11:00 Berlin
    expect(times(computeSlots({ ...base, busy }))).toEqual(["09:00", "11:00"]);
  });

  it("supports a lunch break as two intervals", () => {
    const intervals = [
      { startMin: 14 * 60, endMin: 16 * 60 },
      { startMin: 9 * 60, endMin: 11 * 60 },
    ];
    expect(times(computeSlots({ ...base, intervals, stepMin: 60 }))).toEqual(["09:00", "10:00", "14:00", "15:00"]);
  });

  it("hides past slots and respects the lead time", () => {
    const now = at("2026-12-01T08:10:00Z"); // 09:10 Berlin
    expect(times(computeSlots({ ...base, now }))).toEqual(["09:30", "10:00", "10:30", "11:00"]);
    expect(times(computeSlots({ ...base, now, minLeadMin: 60 }))).toEqual(["10:30", "11:00"]);
  });

  it("returns nothing on a day off", () => {
    expect(computeSlots({ ...base, intervals: [] })).toEqual([]);
  });

  it("handles the DST change day without inventing times", () => {
    const slots = computeSlots({
      ...base,
      date: "2026-03-29",
      now: at("2026-03-01T00:00:00Z"),
      intervals: [{ startMin: 60, endMin: 5 * 60 }],
    });
    expect(times(slots)).toEqual(["01:00", "01:30", "03:00", "03:30", "04:00"]);
  });

  it("rejects invalid input", () => {
    expect(() => computeSlots({ ...base, durationMin: 0 })).toThrow();
    expect(() => computeSlots({ ...base, date: "01.12.2026" })).toThrow();
  });
});
