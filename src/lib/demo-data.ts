// Demo data: a small barbershop in Berlin with three staff members and a week of sample bookings.
// Used by `npm run db:seed` locally and by the nightly reset of the public demo.
import { randomBytes } from "node:crypto";
import type { PrismaClient } from "../generated/prisma/client";
import { addDays, dayKey } from "./dates";
import { hashPassword } from "./password";
import { weekdayOf, zonedInstant } from "./slots";

const h = (hours: number, minutes = 0) => hours * 60 + minutes;
const TZ = "Europe/Berlin";

/** Public demo login, shown on the admin sign-in page when DEMO_MODE=1. */
export const DEMO_ADMIN = { email: "demo@northside.example", password: "demo-admin-2026" };

const CUSTOMERS = [
  ["Anna Schmidt", "anna.schmidt"],
  ["Ben Müller", "ben.mueller"],
  ["Clara Fischer", "clara.f"],
  ["David Wagner", "d.wagner"],
  ["Elif Yilmaz", "elif.y"],
  ["Felix Braun", "felix.braun"],
  ["Greta Hoffmann", "greta.h"],
  ["Hannes Koch", "hannes.koch"],
  ["Ida Richter", "ida.r"],
  ["Jan Klein", "jan.klein"],
] as const;

const NOTES = [null, null, "First visit", null, "Please keep it short on the sides", null, "Running 5 minutes late maybe"];

export async function seedDemo(db: PrismaClient, opts: { now?: Date; admin?: { email: string; password: string } | null } = {}) {
  const now = opts.now ?? new Date();

  await db.booking.deleteMany();
  await db.timeOff.deleteMany();
  await db.workingHours.deleteMany();
  await db.staffService.deleteMany();
  await db.staff.deleteMany();
  await db.service.deleteMany();
  await db.business.deleteMany();

  await db.business.create({
    data: {
      id: 1,
      name: "Northside Barbers",
      timeZone: TZ,
      slotStepMin: 15,
      bookingDays: 30,
      email: "hello@northside.example",
      phone: "+49 30 1234567",
      address: "Musterstraße 12, 10115 Berlin",
    },
  });

  const serviceData = [
    { nameEn: "Haircut", nameDe: "Haarschnitt", descEn: "Wash, cut and styling", descDe: "Waschen, Schneiden und Styling", durationMin: 45, priceCents: 3500 },
    { nameEn: "Beard trim", nameDe: "Bartpflege", descEn: "Shape and trim with hot towel", descDe: "Formen und Trimmen mit heißem Tuch", durationMin: 30, priceCents: 2000 },
    { nameEn: "Haircut + beard", nameDe: "Haarschnitt + Bart", descEn: "The full package", descDe: "Das Komplettpaket", durationMin: 75, priceCents: 5000 },
    { nameEn: "Kids haircut", nameDe: "Kinderhaarschnitt", descEn: "For kids under 12", descDe: "Für Kinder unter 12", durationMin: 30, priceCents: 2200 },
  ];
  const services = [];
  for (const [i, s] of serviceData.entries()) services.push(await db.service.create({ data: { ...s, sortOrder: i } }));
  const [haircut, beard, combo, kids] = services;

  const staffData = [
    {
      name: "Lukas Weber",
      titleEn: "Senior barber",
      titleDe: "Senior-Barbier",
      services: [haircut, beard, combo],
      // Mon–Fri 09:00–13:00 and 14:00–18:00
      hours: [1, 2, 3, 4, 5].flatMap((weekday) => [
        { weekday, startMin: h(9), endMin: h(13) },
        { weekday, startMin: h(14), endMin: h(18) },
      ]),
    },
    {
      name: "Sofia Romano",
      titleEn: "Barber & stylist",
      titleDe: "Barbierin & Stylistin",
      services: [haircut, combo, kids],
      // Tue–Sat 11:00–19:00
      hours: [2, 3, 4, 5, 6].map((weekday) => ({ weekday, startMin: h(11), endMin: h(19) })),
    },
    {
      name: "Jonas Becker",
      titleEn: "Junior barber",
      titleDe: "Junior-Barbier",
      services: [haircut, beard, kids],
      // Mon, Wed, Fri, Sat 10:00–16:00
      hours: [1, 3, 5, 6].map((weekday) => ({ weekday, startMin: h(10), endMin: h(16) })),
    },
  ];

  const staff = [];
  for (const s of staffData) {
    staff.push({
      ...s,
      row: await db.staff.create({
        data: {
          name: s.name,
          titleEn: s.titleEn,
          titleDe: s.titleDe,
          services: { create: s.services.map((service) => ({ serviceId: service.id })) },
          workingHours: { create: s.hours },
        },
      }),
    });
  }

  // A week of sample bookings: two or three per person and working day, never overlapping.
  let n = 0;
  const today = dayKey(now, TZ);
  for (let d = 0; d < 7; d++) {
    const date = addDays(today, d);
    const weekday = weekdayOf(date);
    for (const [si, s] of staff.entries()) {
      const first = s.hours.find((x) => x.weekday === weekday);
      if (!first) continue;
      for (const offset of [h(1), h(2, 30), h(4, 30)].slice(0, 2 + ((d + si) % 2))) {
        const service = s.services[(d + si + offset) % s.services.length];
        const startMin = first.startMin + offset;
        // Only inside working hours (e.g. not during Lukas's lunch break).
        const fits = s.hours.some((x) => x.weekday === weekday && startMin >= x.startMin && startMin + service.durationMin <= x.endMin);
        if (!fits) continue;
        const startsAt = zonedInstant(date, startMin, TZ);
        if (!startsAt) continue;
        const [name, mail] = CUSTOMERS[n % CUSTOMERS.length];
        await db.booking.create({
          data: {
            staffId: s.row.id,
            serviceId: service.id,
            startsAt,
            endsAt: new Date(startsAt.getTime() + service.durationMin * 60_000),
            priceCents: service.priceCents,
            customerName: name,
            customerEmail: `${mail}@example.com`,
            customerPhone: n % 3 === 0 ? `+49 151 ${String(1000000 + n * 7919).slice(0, 7)}` : null,
            note: NOTES[n % NOTES.length],
            locale: n % 2 ? "de" : "en",
            manageToken: randomBytes(24).toString("base64url"),
            consentAt: now,
          },
        });
        n++;
      }
    }
  }

  // Sofia is on vacation in two weeks, to show time off in the demo.
  const vacationStart = zonedInstant(addDays(today, 14), 0, TZ);
  const vacationEnd = zonedInstant(addDays(today, 17), 0, TZ);
  if (vacationStart && vacationEnd) {
    await db.timeOff.create({ data: { staffId: staff[1].row.id, startsAt: vacationStart, endsAt: vacationEnd, reason: "Vacation" } });
  }

  const admins = [opts.admin, process.env.DEMO_MODE === "1" ? DEMO_ADMIN : null].filter(
    (a): a is { email: string; password: string } => !!a?.email && !!a.password,
  );
  for (const a of admins) {
    const email = a.email.toLowerCase();
    const passwordHash = await hashPassword(a.password);
    await db.adminUser.upsert({ where: { email }, update: { passwordHash }, create: { email, name: "Shop owner", passwordHash } });
  }

  return { services: services.length, staff: staff.length, bookings: n, admins: admins.map((a) => a.email) };
}
