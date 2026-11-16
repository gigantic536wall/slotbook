// Runs during deployment: fills an empty database with the demo shop (only when DEMO_MODE=1).
import "dotenv/config";
import { db } from "../src/lib/db";
import { seedDemo } from "../src/lib/demo-data";

async function main() {
  if (process.env.DEMO_MODE !== "1") return console.log("DEMO_MODE is off: skipping demo data.");
  if (await db.business.findUnique({ where: { id: 1 } })) return console.log("Database already has data.");
  const r = await seedDemo(db);
  console.log(`Demo data created: ${r.services} services, ${r.staff} staff, ${r.bookings} bookings.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
