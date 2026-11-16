"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelBooking } from "@/app/actions";

export function CancelButton({ token }: { token: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-medium transition hover:border-red-400 hover:text-red-700"
      >
        Cancel appointment
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm">
      <span>Cancel this appointment?</span>
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await cancelBooking(token);
            if (result.ok) router.refresh();
            else setError(result.error === "too_late" ? "This appointment has already started." : "Appointment not found.");
          })
        }
        className="rounded-full bg-red-600 px-4 py-1.5 font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        {pending ? "Cancelling…" : "Yes, cancel"}
      </button>
      <button onClick={() => setConfirming(false)} className="text-stone-600 hover:text-stone-900">
        Keep it
      </button>
      {error && <span className="w-full text-red-700">{error}</span>}
    </div>
  );
}
