import Link from "next/link";
import { getCatalog } from "@/lib/catalog";
import { formatPrice } from "@/lib/dates";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export default async function Home() {
  const { business, services, staff } = await getCatalog();

  // Opening hours of the shop = earliest start and latest end of anyone working that day.
  const opening = [1, 2, 3, 4, 5, 6, 0].map((weekday) => {
    const hours = staff.flatMap((p) => p.hours.filter((h) => h.weekday === weekday));
    if (hours.length === 0) return { weekday, text: "Closed" };
    const open = Math.min(...hours.map((h) => h.startMin));
    const close = Math.max(...hours.map((h) => h.endMin));
    return { weekday, text: `${hhmm(open)} – ${hhmm(close)}` };
  });

  return (
    <>
      <section className="bg-stone-900 text-white">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
          <p className="text-sm font-medium uppercase tracking-widest text-amber-400">Berlin · Mitte</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Classic cuts and beard care. Book in 30 seconds.
          </h1>
          <p className="mt-4 max-w-xl text-stone-300">
            Pick a service, choose your barber and a time that suits you. No phone calls, no account needed.
          </p>
          <Link
            href="/book"
            className="mt-8 inline-block rounded-full bg-amber-400 px-6 py-3 font-semibold text-stone-900 transition hover:bg-amber-300"
          >
            Book an appointment
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="text-2xl font-semibold tracking-tight">Services</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {services.map((s) => (
            <li key={s.id} className="rounded-2xl border border-stone-200 bg-white p-5">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="font-semibold">{s.nameEn}</h3>
                <span className="font-semibold">{formatPrice(s.priceCents)}</span>
              </div>
              <p className="mt-1 text-sm text-stone-500">{s.descEn}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-stone-500">{s.durationMin} min</span>
                <Link href={`/book?service=${s.id}`} className="text-sm font-medium text-amber-700 hover:underline">
                  Book →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-12">
        <h2 className="text-2xl font-semibold tracking-tight">Our team</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-3">
          {staff.map((p) => (
            <li key={p.id} className="rounded-2xl border border-stone-200 bg-white p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 font-semibold text-amber-800">
                {p.name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")}
              </div>
              <h3 className="mt-3 font-semibold">{p.name}</h3>
              <p className="text-sm text-stone-500">{p.titleEn}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto grid max-w-5xl gap-8 px-4 pb-16 sm:grid-cols-2">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Opening hours</h2>
          <dl className="mt-4 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
            {opening.map((o) => (
              <div key={o.weekday} className="flex justify-between px-5 py-2.5 text-sm">
                <dt className="font-medium">{WEEKDAYS[o.weekday]}</dt>
                <dd className={o.text === "Closed" ? "text-stone-400" : ""}>{o.text}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Find us</h2>
          <address className="mt-4 space-y-1 rounded-2xl border border-stone-200 bg-white p-5 text-sm not-italic">
            <p className="font-medium">{business.name}</p>
            <p>{business.address}</p>
            <p>{business.phone}</p>
            <p>{business.email}</p>
          </address>
        </div>
      </section>
    </>
  );
}
