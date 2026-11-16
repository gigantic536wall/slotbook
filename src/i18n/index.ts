import de from "./de";
import en, { type Dictionary } from "./en";

export const LOCALES = ["en", "de"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export type { Dictionary };

const dictionaries: Record<Locale, Dictionary> = { en, de };

export const hasLocale = (value: string): value is Locale => (LOCALES as readonly string[]).includes(value);

export const getDictionary = (locale: Locale): Dictionary => dictionaries[locale];

/** Picks the best supported locale from an Accept-Language header, e.g. "de-DE,de;q=0.9,en;q=0.8". */
export function negotiateLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = Number(params.find((p) => p.trim().startsWith("q="))?.split("=")[1] ?? 1);
      return { lang: tag.toLowerCase().split("-")[0], q: Number.isFinite(q) ? q : 0 };
    })
    .filter((x) => x.q > 0)
    .sort((a, b) => b.q - a.q);
  return ranked.map((x) => x.lang).find(hasLocale) ?? DEFAULT_LOCALE;
}

/** Localized field of a database row, e.g. pick(service, "name", "de") → service.nameDe. */
export function pick<T extends Record<string, unknown>, K extends string>(row: T, field: K, locale: Locale) {
  const key = `${field}${locale === "de" ? "De" : "En"}` as keyof T;
  return row[key] as T[`${K}En` & keyof T];
}
