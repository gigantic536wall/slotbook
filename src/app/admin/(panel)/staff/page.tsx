import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Staff" };

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function StaffPage() {
  return (
    <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
      <StaffList />
    </Suspense>
  );
}

async function StaffList() {
  await requireAdmin();
  const staff = await db.staff.findMany({
    orderBy: { id: "asc" },
    include: { workingHours: true, services: { include: { service: true } } },
  });

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
        <Link href="/admin/staff/new" className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700">
          + Add staff member
        </Link>
      </div>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {staff.map((p) => {
          const days = [...new Set(p.workingHours.map((h) => h.weekday))].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
          return (
            <li key={p.id}>
              <Link
                href={`/admin/staff/${p.id}`}
                className="block h-full rounded-2xl border border-stone-200 bg-white p-5 transition hover:border-amber-400"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">{p.name}</h2>
                  {!p.active && <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs">Inactive</span>}
                </div>
                <p className="text-sm text-stone-500">{p.titleEn}</p>
                <p className="mt-3 text-sm">{days.length ? days.map((d) => DAYS[d]).join(", ") : "No working days"}</p>
                <p className="mt-1 text-xs text-stone-500">{p.services.map((s) => s.service.nameEn).join(" · ")}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
