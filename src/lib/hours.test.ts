import { describe, expect, it } from "vitest";
import { formatIntervals, parseIntervals } from "./hours";

describe("parseIntervals", () => {
  it("parses one or more ranges", () => {
    expect(parseIntervals("09:00-13:00, 14:00-18:00")).toEqual({
      ok: true,
      intervals: [
        { startMin: 540, endMin: 780 },
        { startMin: 840, endMin: 1080 },
      ],
    });
  });

  it("accepts single-digit hours, en dashes and sorts ranges", () => {
    expect(parseIntervals("14:00 – 18:00; 9:00-12:30")).toEqual({
      ok: true,
      intervals: [
        { startMin: 540, endMin: 750 },
        { startMin: 840, endMin: 1080 },
      ],
    });
  });

  it("treats an empty string as a day off", () => {
    expect(parseIntervals("  ")).toEqual({ ok: true, intervals: [] });
  });

  it("allows working until midnight", () => {
    expect(parseIntervals("18:00-24:00")).toEqual({ ok: true, intervals: [{ startMin: 1080, endMin: 1440 }] });
  });

  it("rejects bad formats, reversed and overlapping ranges", () => {
    expect(parseIntervals("9-13").ok).toBe(false);
    expect(parseIntervals("09:00-25:00").ok).toBe(false);
    expect(parseIntervals("13:00-09:00").ok).toBe(false);
    expect(parseIntervals("09:00-13:00, 12:00-15:00").ok).toBe(false);
    expect(parseIntervals("09:00-10:00-11:00").ok).toBe(false);
  });
});

describe("formatIntervals", () => {
  it("formats back to text", () => {
    expect(formatIntervals([{ startMin: 840, endMin: 1080 }, { startMin: 540, endMin: 780 }])).toBe(
      "09:00-13:00, 14:00-18:00",
    );
  });
});
