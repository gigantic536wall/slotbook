import type { Metadata } from "next";
import { Suspense } from "react";
import { ActionForm, inputClass } from "@/components/admin/ActionForm";
import { requireAdmin } from "@/lib/auth";
import { formatPrice } from "@/lib/dates";
import { db } from "@/lib/db";
import { saveService } from "@/app/admin/actions";

export const metadata: Metadata = { title: "Services" };

export default function ServicesPage() {
  return (
    <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
      <Services />
    </Suspense>
  );
}

type Service = Awaited<ReturnType<typeof db.service.findMany>>[number];

async function Services() {
  await requireAdmin();
  const services = await db.service.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Services</h1>
      <p className="mt-1 text-sm text-stone-500">
        Changes appear on the booking page immediately. Inactive services are hidden from customers.
      </p>
      <div className="mt-6 grid gap-4">
        {services.map((s) => (
          <details key={s.id} className="group rounded-2xl border border-stone-200 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
              <span>
                <span className="font-semibold">{s.nameEn}</span>
                <span className="ml-2 text-sm text-stone-500">
                  {s.durationMin} min · {formatPrice(s.priceCents)}
                </span>
                {!s.active && <span className="ml-2 rounded-full bg-stone-200 px-2 py-0.5 text-xs">Inactive</span>}
              </span>
              <span className="text-sm text-amber-700 group-open:hidden">Edit</span>
            </summary>
            <div className="border-t border-stone-200 px-5 py-4">
              <ServiceForm service={s} />
            </div>
          </details>
        ))}
        <details className="rounded-2xl border border-dashed border-stone-300 bg-white">
          <summary className="cursor-pointer list-none px-5 py-4 font-medium text-amber-700">+ Add a service</summary>
          <div className="border-t border-stone-200 px-5 py-4">
            <ServiceForm />
          </div>
        </details>
      </div>
    </>
  );
}

function ServiceForm({ service }: { service?: Service }) {
  return (
    <ActionForm action={saveService} submitLabel={service ? "Save" : "Add service"} className="grid gap-4">
      {service && <input type="hidden" name="id" value={service.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Name (English)
          <input name="nameEn" required defaultValue={service?.nameEn} className={inputClass} />
        </label>
        <label className="text-sm font-medium">
          Name (German)
          <input name="nameDe" required defaultValue={service?.nameDe} className={inputClass} />
        </label>
        <label className="text-sm font-medium">
          Description (English)
          <input name="descEn" defaultValue={service?.descEn ?? ""} className={inputClass} />
        </label>
        <label className="text-sm font-medium">
          Description (German)
          <input name="descDe" defaultValue={service?.descDe ?? ""} className={inputClass} />
        </label>
        <label className="text-sm font-medium">
          Duration (minutes)
          <input name="durationMin" type="number" min={5} max={480} step={5} required defaultValue={service?.durationMin ?? 30} className={inputClass} />
        </label>
        <label className="text-sm font-medium">
          Price (€)
          <input
            name="price"
            inputMode="decimal"
            required
            defaultValue={service ? (service.priceCents / 100).toFixed(2) : ""}
            className={inputClass}
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={service?.active ?? true} className="h-4 w-4 accent-amber-500" />
        Active (customers can book it)
      </label>
    </ActionForm>
  );
}
