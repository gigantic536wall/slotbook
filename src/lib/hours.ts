/** Working hours as text, e.g. "09:00-13:00, 14:00-18:00" ⇄ [{startMin: 540, endMin: 780}, ...]. */
export type Interval = { startMin: number; endMin: number };

const TIME = /^([01]?\d|2[0-4]):([0-5]\d)$/;

function parseTime(text: string): number | null {
  const m = TIME.exec(text.trim());
  if (!m) return null;
  const minutes = Number(m[1]) * 60 + Number(m[2]);
  return minutes <= 24 * 60 ? minutes : null;
}

export const formatMinutes = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export function formatIntervals(intervals: Interval[]): string {
  return [...intervals]
    .sort((a, b) => a.startMin - b.startMin)
    .map((i) => `${formatMinutes(i.startMin)}-${formatMinutes(i.endMin)}`)
    .join(", ");
}

/** Parses the text. An empty string means a day off. Returns an error message for invalid input. */
export function parseIntervals(text: string): { ok: true; intervals: Interval[] } | { ok: false; error: string } {
  const parts = text
    .split(/[,;]/)
    .map((p) => p.trim())
    .filter(Boolean);
  const intervals: Interval[] = [];
  for (const part of parts) {
    const [a, b, extra] = part.split(/\s*[-–]\s*/);
    const startMin = a !== undefined ? parseTime(a) : null;
    const endMin = b !== undefined ? parseTime(b) : null;
    if (extra !== undefined || startMin === null || endMin === null) {
      return { ok: false, error: `"${part}" is not a valid range. Use the format 09:00-13:00.` };
    }
    if (endMin <= startMin) return { ok: false, error: `"${part}" ends before it starts.` };
    intervals.push({ startMin, endMin });
  }
  intervals.sort((x, y) => x.startMin - y.startMin);
  for (let i = 1; i < intervals.length; i++) {
    if (intervals[i].startMin < intervals[i - 1].endMin) {
      return { ok: false, error: "Time ranges overlap." };
    }
  }
  return { ok: true, intervals };
}
