import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CancelButton } from "@/components/CancelButton";
import { getCatalog } from "@/lib/catalog";
import { formatDate, formatPrice, formatTime, isInPast } from "@/lib/dates";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Your appointment",
  // Personal booking pages must never end up in search engines.
  robots: { index: false, follow: false },
};

export default function BookingPage({ params, searchParams }: PageProps<"/booking/[token]">) {
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <Suspense fallback={<p className="text-stone-500">Loading your appointment…</p>}>
        <BookingDetails params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function BookingDetails({ params, searchParams }: PageProps<"/booking/[token]">) {
  const { token } = await params;
  const { new: isNew } = await searchParams;
  if (token.length < 20 || token.length > 64) notFound();

  const [booking, { business }] = await Promise.all([
    db.booking.findUnique({
      where: { manageToken: token },
      include: { service: true, staff: true },
    }),
    getCatalog(),
  ]);
  if (!booking) notFound();

  const tz = business.timeZone;
  const cancelled = booking.status === "CANCELLED";
  const past = isInPast(booking.startsAt);

  return (
    <>
      {isNew === "1" && !cancelled && (
        <div className="mb-6 rounded-2xl bg-emerald-50 p-5 text-emerald-900">
          <p className="text-lg font-semibold">✅ You&apos;re booked!</p>
          <p className="mt-1 text-sm">
            Save this page: you can use its link to view or cancel your appointment.
          </p>
        </div>
      )}

      <h1 className="text-3xl font-semibold tracking-tight">Your appointment</h1>

      <dl className="mt-6 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white text-sm">
        <Row label="Status">
          {cancelled ? (
            <span className="rounded-full bg-stone-200 px-2 py-0.5 text-stone-700">Cancelled</span>
          ) : (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">Confirmed</span>
          )}
        </Row>
        <Row label="Service">
          {booking.service.nameEn} · {booking.service.durationMin} min · {formatPrice(booking.priceCents)}
        </Row>
        <Row label="Barber">{booking.staff.name}</Row>
        <Row label="Date">{formatDate(booking.startsAt, tz)}</Row>
        <Row label="Time">
          {formatTime(booking.startsAt, tz)} – {formatTime(booking.endsAt, tz)}
        </Row>
        <Row label="Name">{booking.customerName}</Row>
        <Row label="Where">
          {business.name}, {business.address}
        </Row>
      </dl>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        {!cancelled && !past && <CancelButton token={token} />}
        <Link href="/book" className="text-sm font-medium text-amber-700 hover:underline">
          Make another booking →
        </Link>
      </div>
      {!cancelled && past && <p className="mt-4 text-sm text-stone-500">This appointment is in the past.</p>}
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 px-5 py-3">
      <dt className="w-24 shrink-0 text-stone-500">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}
