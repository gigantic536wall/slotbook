import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "./db";

export type CatalogService = {
  id: number;
  nameEn: string;
  nameDe: string;
  descEn: string | null;
  descDe: string | null;
  durationMin: number;
  priceCents: number;
};

export type CatalogStaff = {
  id: number;
  name: string;
  titleEn: string | null;
  titleDe: string | null;
  serviceIds: number[];
  hours: { weekday: number; startMin: number; endMin: number }[];
};

export type Catalog = {
  business: {
    name: string;
    timeZone: string;
    slotStepMin: number;
    bookingDays: number;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
  services: CatalogService[];
  staff: CatalogStaff[];
};

export const CATALOG_TAG = "catalog";

/** Business settings, services and staff. Changes rarely, so it is cached and invalidated by the admin panel. */
export async function getCatalog(): Promise<Catalog> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);

  const [business, services, staff] = await Promise.all([
    db.business.findUnique({ where: { id: 1 } }),
    db.service.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    db.staff.findMany({
      where: { active: true },
      orderBy: { id: "asc" },
      include: { services: true, workingHours: true },
    }),
  ]);
  if (!business) throw new Error("Business settings are missing. Run `npm run db:seed`.");

  return {
    business: {
      name: business.name,
      timeZone: business.timeZone,
      slotStepMin: business.slotStepMin,
      bookingDays: business.bookingDays,
      email: business.email,
      phone: business.phone,
      address: business.address,
    },
    services: services.map((s) => ({
      id: s.id,
      nameEn: s.nameEn,
      nameDe: s.nameDe,
      descEn: s.descEn,
      descDe: s.descDe,
      durationMin: s.durationMin,
      priceCents: s.priceCents,
    })),
    staff: staff.map((p) => ({
      id: p.id,
      name: p.name,
      titleEn: p.titleEn,
      titleDe: p.titleDe,
      serviceIds: p.services.map((x) => x.serviceId),
      hours: p.workingHours.map((h) => ({ weekday: h.weekday, startMin: h.startMin, endMin: h.endMin })),
    })),
  };
}
