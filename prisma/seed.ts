// Fills the database with the demo barbershop. Wipes existing business data first.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { seedDemo } from "../src/lib/demo-data";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

seedDemo(db, { admin: email && password ? { email, password } : null })
  .then((r) => {
    console.log(`Seeded ${r.services} services, ${r.staff} staff members and ${r.bookings} sample bookings.`);
    console.log(r.admins.length ? `Admin accounts: ${r.admins.join(", ")}` : "No admin account (set ADMIN_EMAIL / ADMIN_PASSWORD or DEMO_MODE=1).");
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
