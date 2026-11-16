# SlotBook: online booking for small businesses

Online appointment booking for barbershops, salons, studios and clinics. Customers pick a service, a staff member and a free time slot; the owner manages services, schedules and bookings in an admin panel.

**[▶ Live demo](https://slotbook-omega.vercel.app)** · [Admin panel](https://slotbook-omega.vercel.app/admin) (demo login is shown on the sign-in page; data resets every night)

## Highlights

- **No double bookings, guaranteed by the database.** A PostgreSQL exclusion constraint (`EXCLUDE USING gist` on staff + time range) rejects overlapping bookings even when two customers book the same slot at the same moment.
- **Correct time zones.** Opening hours are stored in the business time zone; slot calculation handles daylight saving time changes and is covered by unit tests.
- **Prices are stored per booking**, so changing a price never rewrites past revenue.
- **Flexible schedules.** Several working intervals per day (lunch breaks), days off, vacations, different services per staff member.
- **GDPR-minded.** Consent timestamp stored with every booking, secret manage links instead of customer accounts, self-hosted fonts (no requests to Google).
- **Never trusts the client.** The server re-checks every slot before saving; with "any barber" it falls back to the next free person if someone else was faster.
- **Modern Next.js.** Next.js 16 with Cache Components: the catalog is cached, availability is always fresh.

## Tech stack

Next.js 16 · TypeScript · PostgreSQL (Neon) · Prisma · Tailwind CSS · Vitest · Vercel

## Roadmap

- [x] Database schema and migrations with SQL constraints
- [x] Slot calculation with time zone / DST handling + tests
- [x] Booking flow for customers: service → barber (or anyone) → day → time → details
- [x] Manage / cancel link for customers (no account needed)
- [x] Admin panel: day schedule per staff member with stats, services, staff with weekly hours and time off
- [x] Secure admin sign-in: scrypt password hashes, signed httpOnly session cookie, rate limiting, route protection in `proxy.ts` plus a check in every Server Action
- [x] English / German: `/en` and `/de` URLs, language picked from the browser, typed dictionaries (a missing translation fails the build)
- [x] GDPR: customers delete their own data from the booking page, automatic anonymization after 12 months (`npm run gdpr:cleanup`), privacy policy and Impressum in both languages, no tracking, so no cookie banner is needed
- [ ] Email confirmations
- [x] Live demo on Vercel + Neon PostgreSQL (Frankfurt), daily cron job for demo reset and GDPR cleanup

## Run locally

Requirements: Node.js 22+, PostgreSQL 14+.

```bash
npm install
cp .env.example .env      # then put your PostgreSQL password into DATABASE_URL
npx prisma migrate deploy # creates tables and constraints
npm run db:seed           # demo barbershop data + admin account from ADMIN_EMAIL / ADMIN_PASSWORD
npm run dev               # http://localhost:3000 (admin: /admin)
npm test                  # unit tests
```
