import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { BookingWizard } from "@/components/BookingWizard";
import { getDictionary, hasLocale, type Locale } from "@/i18n";
import { getCatalog } from "@/lib/catalog";
import { bookableDays } from "@/lib/dates";

export async function generateMetadata({ params }: PageProps<"/[lang]/book">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: getDictionary(lang).booking.title } : {};
}

export default async function BookPage({ params }: PageProps<"/[lang]/book">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-10 text-stone-500">…</div>}>
      <Wizard lang={lang} />
    </Suspense>
  );
}

async function Wizard({ lang }: { lang: Locale }) {
  // The list of days depends on the current date, so render it per request.
  await connection();
  const catalog = await getCatalog();
  const days = bookableDays(new Date(), catalog.business.timeZone, catalog.business.bookingDays);
  return <BookingWizard catalog={catalog} days={days} lang={lang} t={getDictionary(lang).booking} />;
}
