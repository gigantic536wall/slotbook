// Deletes personal data of appointments older than the retention period.
// Run daily, e.g. with a cron job or a scheduled GitHub Action: `npm run gdpr:cleanup`.
import "dotenv/config";
import { db } from "../src/lib/db";
import { anonymizeExpired, RETENTION_DAYS } from "../src/lib/gdpr";

anonymizeExpired()
  .then((count) => console.log(`Anonymized ${count} booking(s) older than ${RETENTION_DAYS} days.`))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
