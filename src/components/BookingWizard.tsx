"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createBooking } from "@/app/actions";
import type { Catalog } from "@/lib/catalog";
import { formatPrice, formatTime } from "@/lib/dates";

type Slot = { start: string; staffIds: number[] };
type Step = "service" | "staff" | "time" | "details";

const STEPS: { id: Step; label: string }[] = [
  { id: "service", label: "Service" },
  { id: "staff", label: "Barber" },
  { id: "time", label: "Date & time" },
  { id: "details", label: "Your details" },
];

const ERRORS: Record<string, string> = {
  slot_taken: "Sorry, someone just booked this time. Please pick another one.",
  unavailable: "This time is no longer available. Please pick another one.",
  invalid: "Please check the highlighted fields.",
  network: "Something went wrong. Please try again.",
};

export function BookingWizard({ catalog, days }: { catalog: Catalog; days: string[] }) {
  const { business, services, staff } = catalog;
  const router = useRouter();
  const searchParams = useSearchParams();

  const preselected = Number(searchParams.get("service"));
  const [serviceId, setServiceId] = useState<number | null>(
    services.some((s) => s.id === preselected) ? preselected : null,
  );
  const [staffId, setStaffId] = useState<number | null | undefined>(undefined); // null = anyone
  const [step, setStep] = useState<Step>(serviceId ? "staff" : "service");

  const [date, setDate] = useState<string | null>(null);
  const activeDate = date ?? days[0] ?? null;

  const [slot, setSlot] = useState<Slot | null>(null);
  const [reload, setReload] = useState(0);
  // Each response is stored with the request it answers, so stale data is never shown.
  const requestKey = `${serviceId}|${staffId}|${activeDate}|${reload}`;
  const [result, setResult] = useState<{ key: string; slots?: Slot[]; failed?: boolean } | null>(null);
  const current = result?.key === requestKey ? result : null;
  const slots = current?.slots ?? null;
  const slotsError = current?.failed ?? false;

  const [error, setError] = useState<string | null>(null);
  const [badFields, setBadFields] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const service = services.find((s) => s.id === serviceId) ?? null;
  const eligibleStaff = useMemo(
    () => staff.filter((p) => serviceId !== null && p.serviceIds.includes(serviceId)),
    [staff, serviceId],
  );
  const chosenStaff = staff.find((p) => p.id === staffId) ?? null;

  useEffect(() => {
    if (step !== "time" || !serviceId || staffId === undefined || !activeDate) return;
    const controller = new AbortController();
    const key = requestKey;
    const qs = new URLSearchParams({ serviceId: String(serviceId), staffId: staffId === null ? "any" : String(staffId), date: activeDate });
    fetch(`/api/availability?${qs}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data: { slots: Slot[] }) => setResult({ key, slots: data.slots }))
      .catch((e) => {
        if (e?.name !== "AbortError") setResult({ key, failed: true });
      });
    return () => controller.abort();
  }, [step, serviceId, staffId, activeDate, requestKey]);

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const tz = business.timeZone;

  function submit(form: FormData) {
    if (!service || !slot) return;
    setError(null);
    setBadFields([]);
    startTransition(async () => {
      try {
        const result = await createBooking({
          serviceId: service.id,
          staffId: staffId ?? null,
          start: slot.start,
          name: String(form.get("name") ?? ""),
          email: String(form.get("email") ?? ""),
          phone: String(form.get("phone") ?? ""),
          note: String(form.get("note") ?? ""),
          consent: form.get("consent") === "on",
          locale: "en",
          website: String(form.get("website") ?? ""),
        });
        if (result.ok) {
          router.push(`/booking/${result.token}?new=1`);
          return;
        }
        setError(ERRORS[result.error]);
        if (result.error === "invalid") setBadFields(result.fields ?? []);
        else {
          setSlot(null);
          setReload((n) => n + 1);
          setStep("time");
        }
      } catch {
        setError(ERRORS.network);
      }
    });
  }

  const fieldClass = (name: string) =>
    `mt-1 w-full rounded-lg border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-amber-400 ${
      badFields.includes(name) ? "border-red-500" : "border-stone-300"
    }`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Book an appointment</h1>

      <ol className="mt-6 flex gap-2 text-sm" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li
            key={s.id}
            aria-current={i === stepIndex ? "step" : undefined}
            className={`flex-1 border-t-4 pt-2 ${i <= stepIndex ? "border-amber-400 text-stone-900" : "border-stone-200 text-stone-400"}`}
          >
            <span className="hidden sm:inline">{i + 1}. </span>
            {s.label}
          </li>
        ))}
      </ol>

      {(service || chosenStaff || slot) && step !== "service" && (
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-1 rounded-xl bg-stone-100 px-4 py-3 text-sm">
          {service && (
            <span>
              <b>{service.nameEn}</b> · {service.durationMin} min · {formatPrice(service.priceCents)}
            </span>
          )}
          {step !== "staff" && staffId !== undefined && <span>with {chosenStaff ? chosenStaff.name : "any barber"}</span>}
          {step === "details" && slot && (
            <span>
              {new Date(slot.start).toLocaleDateString("en-GB", { timeZone: tz, weekday: "short", day: "numeric", month: "short" })},{" "}
              {formatTime(slot.start, tz)}
            </span>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {step === "service" && (
        <ul className="mt-6 grid gap-3">
          {services.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => {
                  setServiceId(s.id);
                  setStaffId(undefined);
                  setSlot(null);
                  setStep("staff");
                }}
                className="flex w-full items-center justify-between rounded-2xl border border-stone-200 bg-white p-5 text-left transition hover:border-amber-400"
              >
                <span>
                  <span className="block font-semibold">{s.nameEn}</span>
                  <span className="text-sm text-stone-500">
                    {s.descEn} · {s.durationMin} min
                  </span>
                </span>
                <span className="font-semibold">{formatPrice(s.priceCents)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {step === "staff" && (
        <>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            <li>
              <button
                onClick={() => {
                  setStaffId(null);
                  setStep("time");
                }}
                className="h-full w-full rounded-2xl border border-stone-200 bg-white p-5 text-left transition hover:border-amber-400"
              >
                <span className="block font-semibold">Any barber</span>
                <span className="text-sm text-stone-500">Most available times</span>
              </button>
            </li>
            {eligibleStaff.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => {
                    setStaffId(p.id);
                    setStep("time");
                  }}
                  className="h-full w-full rounded-2xl border border-stone-200 bg-white p-5 text-left transition hover:border-amber-400"
                >
                  <span className="block font-semibold">{p.name}</span>
                  <span className="text-sm text-stone-500">{p.titleEn}</span>
                </button>
              </li>
            ))}
          </ul>
          <BackButton onClick={() => setStep("service")} />
        </>
      )}

      {step === "time" && (
        <>
          <div className="mt-6 flex gap-2 overflow-x-auto pb-2" role="listbox" aria-label="Day">
            {days.map((d) => {
              const label = new Date(`${d}T12:00:00Z`);
              const selected = d === activeDate;
              return (
                <button
                  key={d}
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    setDate(d);
                    setSlot(null);
                  }}
                  className={`min-w-16 shrink-0 rounded-xl border px-3 py-2 text-center text-sm transition ${
                    selected ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-white hover:border-amber-400"
                  }`}
                >
                  <span className="block text-xs uppercase">{label.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })}</span>
                  <span className="block text-lg font-semibold">{label.getUTCDate()}</span>
                  <span className="block text-xs">{label.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 min-h-32">
            {slotsError && <p className="text-sm text-red-600">Could not load available times. Please try again.</p>}
            {!slotsError && slots === null && <p className="text-sm text-stone-500">Loading available times…</p>}
            {slots && slots.length === 0 && (
              <p className="text-sm text-stone-500">No free times on this day. Please choose another day.</p>
            )}
            {slots && slots.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {slots.map((s) => (
                  <button
                    key={s.start}
                    onClick={() => {
                      setSlot(s);
                      setError(null);
                      setStep("details");
                    }}
                    className="rounded-lg border border-stone-200 bg-white py-2 text-sm font-medium transition hover:border-amber-400 hover:bg-amber-50"
                  >
                    {formatTime(s.start, tz)}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="mt-4 text-xs text-stone-500">Times are shown in Berlin time ({tz}).</p>
          <BackButton onClick={() => setStep("staff")} />
        </>
      )}

      {step === "details" && (
        <form
          // onSubmit instead of action: React resets forms after an action, and on an error
          // the customer should not have to type everything again.
          onSubmit={(e) => {
            e.preventDefault();
            submit(new FormData(e.currentTarget));
          }}
          className="mt-6 grid gap-4"
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Name *
              <input name="name" required autoComplete="name" className={fieldClass("name")} />
            </label>
            <label className="text-sm font-medium">
              Email *
              <input name="email" type="email" required autoComplete="email" className={fieldClass("email")} />
            </label>
            <label className="text-sm font-medium">
              Phone <span className="font-normal text-stone-500">(optional)</span>
              <input name="phone" type="tel" autoComplete="tel" className={fieldClass("phone")} />
            </label>
            <label className="text-sm font-medium">
              Note <span className="font-normal text-stone-500">(optional)</span>
              <input name="note" maxLength={500} className={fieldClass("note")} />
            </label>
          </div>
          {/* Honeypot for bots, hidden from people and screen readers. */}
          <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
          <label className={`flex items-start gap-3 text-sm ${badFields.includes("consent") ? "text-red-600" : ""}`}>
            <input name="consent" type="checkbox" className="mt-1 h-4 w-4 accent-amber-500" />
            <span>
              I agree that my data is used to manage this appointment, as described in the{" "}
              <Link href="/privacy" target="_blank" className="underline">
                privacy policy
              </Link>
              . *
            </span>
          </label>
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-stone-900 px-6 py-3 font-semibold text-white transition hover:bg-stone-700 disabled:opacity-50"
            >
              {pending ? "Booking…" : "Confirm booking"}
            </button>
            <button type="button" onClick={() => setStep("time")} className="text-sm text-stone-500 hover:text-stone-900">
              ← Change time
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="mt-6 text-sm text-stone-500 hover:text-stone-900">
      ← Back
    </button>
  );
}
