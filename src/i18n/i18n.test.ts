import { describe, expect, it } from "vitest";
import { getDictionary, negotiateLocale, pick } from ".";

describe("negotiateLocale", () => {
  it("picks German for German browsers", () => {
    expect(negotiateLocale("de-DE,de;q=0.9,en;q=0.8")).toBe("de");
    expect(negotiateLocale("de-AT")).toBe("de");
  });

  it("respects quality values", () => {
    expect(negotiateLocale("fr-FR,de;q=0.5,en;q=0.9")).toBe("en");
    expect(negotiateLocale("en;q=0.1,de;q=0.7")).toBe("de");
  });

  it("falls back to English", () => {
    expect(negotiateLocale(null)).toBe("en");
    expect(negotiateLocale("fr,es")).toBe("en");
    expect(negotiateLocale("de;q=0")).toBe("en");
  });
});

describe("dictionaries", () => {
  // Type checking already requires the same keys; this also catches empty strings.
  const flatten = (o: unknown, prefix = ""): [string, unknown][] =>
    typeof o === "object" && o !== null
      ? Object.entries(o).flatMap(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k))
      : [[prefix, o]];

  it("has the same keys in English and German and no empty texts", () => {
    const en = flatten(getDictionary("en"));
    const de = flatten(getDictionary("de"));
    expect(de.map(([k]) => k).sort()).toEqual(en.map(([k]) => k).sort());
    expect(de.filter(([, v]) => v === "")).toEqual([]);
  });
});

describe("pick", () => {
  it("returns the localized database field", () => {
    const service = { nameEn: "Haircut", nameDe: "Haarschnitt" };
    expect(pick(service, "name", "de")).toBe("Haarschnitt");
    expect(pick(service, "name", "en")).toBe("Haircut");
  });
});
