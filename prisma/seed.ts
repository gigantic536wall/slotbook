// Demo data: a small barbershop in Berlin with three staff members.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const h = (hours: number, minutes = 0) => hours * 60 + minutes;

async function main() {
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
      timeZone: "Europe/Berlin",
      slotStepMin: 15,
      bookingDays: 30,
      email: "hello@northside.example",
      phone: "+49 30 1234567",
      address: "Musterstraße 12, 10115 Berlin",
    },
  });

  const services = await Promise.all(
    [
      { nameEn: "Haircut", nameDe: "Haarschnitt", descEn: "Wash, cut and styling", descDe: "Waschen, Schneiden und Styling", durationMin: 45, priceCents: 3500 },
      { nameEn: "Beard trim", nameDe: "Bartpflege", descEn: "Shape and trim with hot towel", descDe: "Formen und Trimmen mit heißem Tuch", durationMin: 30, priceCents: 2000 },
      { nameEn: "Haircut + beard", nameDe: "Haarschnitt + Bart", descEn: "The full package", descDe: "Das Komplettpaket", durationMin: 75, priceCents: 5000 },
      { nameEn: "Kids haircut", nameDe: "Kinderhaarschnitt", descEn: "For kids under 12", descDe: "Für Kinder unter 12", durationMin: 30, priceCents: 2200 },
    ].map((s, i) => db.service.create({ data: { ...s, sortOrder: i } })),
  );
  const [haircut, beard, combo, kids] = services;

  const weekdays = [1, 2, 3, 4, 5];
  const staff = [
    {
      name: "Lukas Weber",
      titleEn: "Senior barber",
      titleDe: "Senior-Barbier",
      services: [haircut, beard, combo],
      // Mon–Fri 09:00–13:00 and 14:00–18:00
      hours: weekdays.flatMap((weekday) => [
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

  for (const s of staff) {
    await db.staff.create({
      data: {
        name: s.name,
        titleEn: s.titleEn,
        titleDe: s.titleDe,
        services: { create: s.services.map((service) => ({ serviceId: service.id })) },
        workingHours: { create: s.hours },
      },
    });
  }

  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    const passwordHash = await hashPassword(password);
    await db.adminUser.upsert({
      where: { email },
      update: { passwordHash },
      create: { email, name: "Shop owner", passwordHash },
    });
    console.log(`Admin account: ${email}`);
  } else {
    console.warn("ADMIN_EMAIL / ADMIN_PASSWORD not set: no admin account created.");
  }

  console.log(`Seeded ${services.length} services and ${staff.length} staff members.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
