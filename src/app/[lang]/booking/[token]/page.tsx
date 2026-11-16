import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CancelButton, DeleteDataButton } from "@/components/CancelButton";
import { getDictionary, hasLocale, pick } from "@/i18n";
import { getCatalog } from "@/lib/catalog";
import { formatDate, formatPrice, formatTime, isInPast } from "@/lib/dates";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  // Personal booking pages must never end up in search engines.
  robots: { index: false, follow: false },
};

export default function BookingPage({ params, searchParams }: PageProps<"/[lang]/booking/[token]">) {
  // The token is only known per request, so everything that reads params is inside Suspense.
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <Suspense fallback={<p className="text-stone-500">…</p>}>
        <BookingDetails params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function BookingDetails({ params, searchParams }: Pick<PageProps<"/[lang]/booking/[token]">, "params" | "searchParams">) {
  const { lang, token } = await params;
  const { new: isNew } = await searchParams;
  if (!hasLocale(lang)) notFound();
  if (token.length < 20 || token.length > 64) notFound();
  const t = getDictionary(lang).appointment;

  const [booking, { business }] = await Promise.all([
    db.booking.findUnique({ where: { manageToken: token }, include: { service: true, staff: true } }),
    getCatalog(),
  ]);
  if (!booking) notFound();

  const tz = business.timeZone;
  const cancelled = booking.status === "CANCELLED";
  const past = isInPast(booking.startsAt);
  const anonymized = booking.anonymizedAt !== null;

  return (
    <>
      {isNew === "1" && !cancelled && (
        <div className="mb-6 rounded-2xl bg-emerald-50 p-5 text-emerald-900">
          <p className="text-lg font-semibold">{t.booked}</p>
          <p className="mt-1 text-sm">{t.bookedHint}</p>
        </div>
      )}

      <h1 className="text-3xl font-semibold tracking-tight">{t.title}</h1>

      <dl className="mt-6 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white text-sm">
        <Row label={t.status}>
          {cancelled ? (
            <span className="rounded-full bg-stone-200 px-2 py-0.5 text-stone-700">{t.cancelled}</span>
          ) : (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">{t.confirmed}</span>
          )}
        </Row>
        <Row label={t.service}>
          {pick(booking.service, "name", lang)} · {booking.service.durationMin} min · {formatPrice(booking.priceCents, lang)}
        </Row>
        <Row label={t.barber}>{booking.staff.name}</Row>
        <Row label={t.date}>{formatDate(booking.startsAt, tz, lang)}</Row>
        <Row label={t.time}>
          {formatTime(booking.startsAt, tz, lang)} – {formatTime(booking.endsAt, tz, lang)}
        </Row>
        <Row label={t.name}>{anonymized ? <i className="text-stone-500">{t.anonymous}</i> : booking.customerName}</Row>
        <Row label={t.where}>
          {business.name}, {business.address}
        </Row>
      </dl>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        {!cancelled && !past && <CancelButton token={token} t={t} />}
        <Link href={`/${lang}/book`} className="text-sm font-medium text-amber-700 hover:underline">
          {t.another}
        </Link>
      </div>
      {!cancelled && past && <p className="mt-4 text-sm text-stone-500">{t.past}</p>}

      <section className="mt-10 border-t border-stone-200 pt-6">
        <h2 className="font-semibold">{t.deleteTitle}</h2>
        {anonymized ? (
          <p className="mt-2 text-sm text-emerald-700">{t.deleted}</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-stone-500">{t.deleteText}</p>
            <div className="mt-4">
              <DeleteDataButton token={token} t={t} />
            </div>
          </>
        )}
      </section>
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
