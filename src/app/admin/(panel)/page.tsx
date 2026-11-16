import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { addDays, dayKey, formatDate, formatPrice, formatTime } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatIntervals } from "@/lib/hours";
import { weekdayOf, zonedInstant } from "@/lib/slots";
import { adminCancelBooking } from "@/app/admin/actions";

export const metadata: Metadata = { title: "Schedule" };

export default function SchedulePage({ searchParams }: PageProps<"/admin">) {
  return (
    <Suspense fallback={<p className="text-stone-500">Loading schedule…</p>}>
      <Schedule searchParams={searchParams} />
    </Suspense>
  );
}

async function Schedule({ searchParams }: Pick<PageProps<"/admin">, "searchParams">) {
  await requireAdmin();
  const business = await db.business.findUniqueOrThrow({ where: { id: 1 } });
  const tz = business.timeZone;
  const today = dayKey(new Date(), tz);
  const { date: dateParam } = await searchParams;
  const date = typeof dateParam === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : today;

  const dayStart = zonedInstant(date, 0, tz)!;
  const dayEnd = zonedInstant(addDays(date, 1), 0, tz)!;
  const weekEnd = zonedInstant(addDays(date, 7), 0, tz)!;
  const weekday = weekdayOf(date);

  const [staff, bookings, weekBookings, timeOff] = await Promise.all([
    db.staff.findMany({ where: { active: true }, orderBy: { id: "asc" }, include: { workingHours: { where: { weekday } } } }),
    db.booking.findMany({
      where: { startsAt: { gte: dayStart, lt: dayEnd } },
      orderBy: { startsAt: "asc" },
      include: { service: true },
    }),
    db.booking.findMany({
      where: { status: "CONFIRMED", startsAt: { gte: dayStart, lt: weekEnd } },
      select: { priceCents: true },
    }),
    db.timeOff.findMany({ where: { startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } } }),
  ]);

  const confirmed = bookings.filter((b) => b.status === "CONFIRMED");
  const revenue = confirmed.reduce((sum, b) => sum + b.priceCents, 0);
  const weekRevenue = weekBookings.reduce((sum, b) => sum + b.priceCents, 0);
  const now = new Date();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{formatDate(dayStart, tz)}</h1>
          {date === today && <p className="text-sm text-amber-700">Today</p>}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link href={`/admin?date=${addDays(date, -1)}`} className="rounded-lg border border-stone-300 px-3 py-1.5 hover:bg-white">
            ← Prev
          </Link>
          <Link href="/admin" className="rounded-lg border border-stone-300 px-3 py-1.5 hover:bg-white">
            Today
          </Link>
          <Link href={`/admin?date=${addDays(date, 1)}`} className="rounded-lg border border-stone-300 px-3 py-1.5 hover:bg-white">
            Next →
          </Link>
          <form className="flex items-center gap-2">
            <input type="date" name="date" defaultValue={date} className="rounded-lg border border-stone-300 bg-white px-2 py-1.5" />
            <button className="rounded-lg bg-stone-900 px-3 py-1.5 text-white">Go</button>
          </form>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Bookings this day" value={String(confirmed.length)} />
        <Stat label="Revenue this day" value={formatPrice(revenue)} />
        <Stat label="Next 7 days" value={String(weekBookings.length)} />
        <Stat label="Revenue next 7 days" value={formatPrice(weekRevenue)} />
      </dl>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {staff.map((person) => {
          const own = bookings.filter((b) => b.staffId === person.id);
          const off = timeOff.filter((t) => t.staffId === person.id);
          return (
            <section key={person.id} className="rounded-2xl border border-stone-200 bg-white">
              <header className="border-b border-stone-200 px-4 py-3">
                <h2 className="font-semibold">{person.name}</h2>
                <p className="text-xs text-stone-500">
                  {off.length > 0
                    ? `Off: ${off.map((t) => t.reason ?? "time off").join(", ")}`
                    : person.workingHours.length > 0
                      ? `Works ${formatIntervals(person.workingHours)}`
                      : "Day off"}
                </p>
              </header>
              {own.length === 0 ? (
                <p className="px-4 py-6 text-sm text-stone-400">No bookings</p>
              ) : (
                <ul className="divide-y divide-stone-100">
                  {own.map((b) => {
                    const cancelled = b.status === "CANCELLED";
                    return (
                      <li key={b.id} className={`px-4 py-3 text-sm ${cancelled ? "opacity-50" : ""}`}>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-semibold tabular-nums">
                            {formatTime(b.startsAt, tz)}–{formatTime(b.endsAt, tz)}
                          </span>
                          <span className="text-stone-500">{b.service.nameEn}</span>
                        </div>
                        <p className={`mt-1 font-medium ${cancelled ? "line-through" : ""}`}>{b.customerName}</p>
                        <p className="text-stone-500">
                          <a href={`mailto:${b.customerEmail}`} className="hover:underline">
                            {b.customerEmail}
                          </a>
                          {b.customerPhone && (
                            <>
                              {" · "}
                              <a href={`tel:${b.customerPhone}`} className="hover:underline">
                                {b.customerPhone}
                              </a>
                            </>
                          )}
                        </p>
                        {b.note && <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-stone-700">“{b.note}”</p>}
                        {cancelled ? (
                          <p className="mt-1 text-xs uppercase text-stone-500">Cancelled</p>
                        ) : (
                          b.startsAt > now && (
                            <form action={adminCancelBooking} className="mt-2">
                              <input type="hidden" name="id" value={b.id} />
                              <button className="text-xs font-medium text-red-600 hover:underline">Cancel booking</button>
                            </form>
                          )
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
