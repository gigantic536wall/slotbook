import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ActionForm, inputClass } from "@/components/admin/ActionForm";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatIntervals } from "@/lib/hours";
import { addTimeOff, deleteTimeOff, saveStaff } from "@/app/admin/actions";

export const metadata: Metadata = { title: "Edit staff member" };

// Monday first, as in European calendars.
const WEEK = [
  { weekday: 1, key: "mon", label: "Monday" },
  { weekday: 2, key: "tue", label: "Tuesday" },
  { weekday: 3, key: "wed", label: "Wednesday" },
  { weekday: 4, key: "thu", label: "Thursday" },
  { weekday: 5, key: "fri", label: "Friday" },
  { weekday: 6, key: "sat", label: "Saturday" },
  { weekday: 0, key: "sun", label: "Sunday" },
];

export default function EditStaffPage({ params, searchParams }: PageProps<"/admin/staff/[id]">) {
  return (
    <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
      <EditStaff params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function EditStaff({ params, searchParams }: PageProps<"/admin/staff/[id]">) {
  await requireAdmin();
  const { id: idParam } = await params;
  const { created } = await searchParams;
  const isNew = idParam === "new";
  const id = Number(idParam);
  if (!isNew && !Number.isInteger(id)) notFound();

  const [person, services, business] = await Promise.all([
    isNew
      ? null
      : db.staff.findUnique({
          where: { id },
          include: {
            workingHours: true,
            services: true,
            timeOff: { where: { endsAt: { gt: new Date() } }, orderBy: { startsAt: "asc" } },
          },
        }),
    db.service.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    db.business.findUniqueOrThrow({ where: { id: 1 } }),
  ]);
  if (!isNew && !person) notFound();

  const offered = new Set(person?.services.map((s) => s.serviceId) ?? []);
  const tz = business.timeZone;

  return (
    <>
      <Link href="/admin/staff" className="text-sm text-stone-500 hover:text-stone-900">
        ← All staff
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{person ? person.name : "New staff member"}</h1>
      {created === "1" && <p className="mt-2 text-sm text-emerald-700">Staff member created.</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="rounded-2xl border border-stone-200 bg-white p-5">
          <ActionForm action={saveStaff} submitLabel={person ? "Save changes" : "Create"} className="grid gap-5">
            {person && <input type="hidden" name="id" value={person.id} />}
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="text-sm font-medium">
                Name
                <input name="name" required defaultValue={person?.name} className={inputClass} />
              </label>
              <label className="text-sm font-medium">
                Title (English)
                <input name="titleEn" defaultValue={person?.titleEn ?? ""} className={inputClass} />
              </label>
              <label className="text-sm font-medium">
                Title (German)
                <input name="titleDe" defaultValue={person?.titleDe ?? ""} className={inputClass} />
              </label>
            </div>

            <fieldset>
              <legend className="text-sm font-medium">Services</legend>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                {services.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="serviceIds" value={s.id} defaultChecked={offered.has(s.id)} className="h-4 w-4 accent-amber-500" />
                    {s.nameEn}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-medium">Weekly hours</legend>
              <p className="text-xs text-stone-500">Example: 09:00-13:00, 14:00-18:00. Leave empty for a day off.</p>
              <div className="mt-2 grid gap-2">
                {WEEK.map((d) => (
                  <label key={d.key} className="grid grid-cols-[6rem_1fr] items-center gap-3 text-sm">
                    <span>{d.label}</span>
                    <input
                      name={`hours_${d.key}`}
                      defaultValue={formatIntervals(person?.workingHours.filter((h) => h.weekday === d.weekday) ?? [])}
                      placeholder="Day off"
                      className={`${inputClass} mt-0 font-mono`}
                    />
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="active" defaultChecked={person?.active ?? true} className="h-4 w-4 accent-amber-500" />
              Active (customers can book this person)
            </label>
          </ActionForm>
        </section>

        {person && (
          <section className="rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="font-semibold">Time off</h2>
            {person.timeOff.length === 0 ? (
              <p className="mt-2 text-sm text-stone-500">No upcoming time off.</p>
            ) : (
              <ul className="mt-3 grid gap-2 text-sm">
                {person.timeOff.map((t) => (
                  <li key={t.id} className="flex items-start justify-between gap-2 rounded-lg bg-stone-50 px-3 py-2">
                    <span>
                      {formatDate(t.startsAt, tz)}
                      {t.endsAt.getTime() - t.startsAt.getTime() > 24 * 3600_000 && <> – {formatDate(new Date(t.endsAt.getTime() - 1), tz)}</>}
                      {t.reason && <span className="block text-stone-500">{t.reason}</span>}
                    </span>
                    <form action={deleteTimeOff}>
                      <input type="hidden" name="id" value={t.id} />
                      <input type="hidden" name="staffId" value={person.id} />
                      <button className="text-xs text-red-600 hover:underline">Remove</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <ActionForm action={addTimeOff} submitLabel="Add time off" className="mt-4 grid gap-3 border-t border-stone-200 pt-4">
              <input type="hidden" name="staffId" value={person.id} />
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-medium">
                  From
                  <input type="date" name="from" required className={inputClass} />
                </label>
                <label className="text-sm font-medium">
                  To
                  <input type="date" name="to" required className={inputClass} />
                </label>
              </div>
              <label className="text-sm font-medium">
                Reason <span className="font-normal text-stone-500">(optional)</span>
                <input name="reason" placeholder="Vacation" className={inputClass} />
              </label>
            </ActionForm>
          </section>
        )}
      </div>
    </>
  );
}
