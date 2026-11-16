import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4 px-4 py-10 text-stone-700">
      <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Privacy policy</h1>
      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
        This is a demo project. The text below is a sample and not legal advice.
      </p>
      <h2 className="pt-2 text-lg font-semibold text-stone-900">What we collect</h2>
      <p>
        When you book, we store your name, email address, optional phone number and note, the chosen service, barber
        and time, and the moment you gave consent.
      </p>
      <h2 className="pt-2 text-lg font-semibold text-stone-900">Why</h2>
      <p>
        Only to manage your appointment (Art. 6(1)(b) GDPR). We do not sell your data or use it for advertising.
      </p>
      <h2 className="pt-2 text-lg font-semibold text-stone-900">How long</h2>
      <p>Booking data is deleted 12 months after the appointment date.</p>
      <h2 className="pt-2 text-lg font-semibold text-stone-900">Your rights</h2>
      <p>
        You can request access to, correction or deletion of your data at any time by writing to the email address on
        our home page.
      </p>
    </article>
  );
}
