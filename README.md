# SlotBook: online booking for small businesses

Online appointment booking for barbershops, salons, studios and clinics. Customers pick a service, a staff member and a free time slot; the owner manages services, schedules and bookings in an admin panel.

> 🚧 Work in progress. Live demo coming soon.

## Highlights

- **No double bookings, guaranteed by the database.** A PostgreSQL exclusion constraint (`EXCLUDE USING gist` on staff + time range) rejects overlapping bookings even when two customers book the same slot at the same moment.
- **Correct time zones.** Opening hours are stored in the business time zone; slot calculation handles daylight saving time changes and is covered by unit tests.
- **Flexible schedules.** Several working intervals per day (lunch breaks), days off, vacations, different services per staff member.
- **GDPR-minded.** Consent timestamp stored with every booking, secret manage links instead of customer accounts.

## Tech stack

Next.js · TypeScript · PostgreSQL · Prisma · Tailwind CSS · Vitest

## Roadmap

- [x] Database schema and migrations with SQL constraints
- [x] Slot calculation with time zone / DST handling + tests
- [ ] Booking flow for customers
- [ ] Admin panel
- [ ] English / German
- [ ] Cookie banner and data deletion (GDPR)
- [ ] Email confirmations
- [ ] Live demo

## Run locally

Requirements: Node.js 22+, PostgreSQL 14+.

```bash
npm install
cp .env.example .env      # then put your PostgreSQL password into DATABASE_URL
npx prisma migrate deploy # creates tables and constraints
npm run db:seed           # demo barbershop data
npm run dev               # http://localhost:3000
npm test                  # unit tests
```
