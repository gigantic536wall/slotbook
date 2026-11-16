import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { BookingWizard } from "@/components/BookingWizard";
import { getCatalog } from "@/lib/catalog";
import { bookableDays } from "@/lib/dates";

export const metadata: Metadata = { title: "Book an appointment" };

export default function BookPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-10 text-stone-500">Loading…</div>}>
      <Wizard />
    </Suspense>
  );
}

async function Wizard() {
  // The list of days depends on the current date, so render it per request.
  await connection();
  const catalog = await getCatalog();
  const days = bookableDays(new Date(), catalog.business.timeZone, catalog.business.bookingDays);
  return <BookingWizard catalog={catalog} days={days} />;
}
