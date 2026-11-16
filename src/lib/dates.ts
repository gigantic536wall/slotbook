import { TZDate } from "@date-fns/tz";

/** "YYYY-MM-DD" of the given instant in the time zone. */
export function dayKey(instant: Date, timeZone: string): string {
  const t = new TZDate(instant.getTime(), timeZone);
  const mm = String(t.getMonth() + 1).padStart(2, "0");
  const dd = String(t.getDate()).padStart(2, "0");
  return `${t.getFullYear()}-${mm}-${dd}`;
}

/** Adds whole calendar days to a "YYYY-MM-DD" string. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

/** The bookable days, starting today in the business time zone. */
export function bookableDays(now: Date, timeZone: string, count: number): string[] {
  const first = dayKey(now, timeZone);
  return Array.from({ length: count }, (_, i) => addDays(first, i));
}

/** True if the instant is now or earlier. Reads the clock, so call it only at request time. */
export function isInPast(instant: Date): boolean {
  return instant.getTime() <= Date.now();
}

export function formatPrice(cents: number, locale = "en"): string {
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-IE", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
}

export function formatTime(instant: Date | string, timeZone: string, locale = "en"): string {
  return new Date(instant).toLocaleTimeString(locale === "de" ? "de-DE" : "en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(instant: Date | string, timeZone: string, locale = "en"): string {
  return new Date(instant).toLocaleDateString(locale === "de" ? "de-DE" : "en-GB", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
