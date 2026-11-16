"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelBooking, deleteMyData } from "@/app/actions";
import type { Dictionary } from "@/i18n";

type T = Dictionary["appointment"];

/** A button that asks for confirmation before running a destructive action. */
function ConfirmAction({
  label,
  question,
  yes,
  working,
  keep,
  run,
}: {
  label: string;
  question: string;
  yes: string;
  working: string;
  keep: string;
  run: () => Promise<string | null>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-medium transition hover:border-red-400 hover:text-red-700"
      >
        {label}
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm">
      <span>{question}</span>
      <button
        disabled={pending}
        onClick={() => startTransition(async () => setError(await run()))}
        className="rounded-full bg-red-600 px-4 py-1.5 font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        {pending ? working : yes}
      </button>
      <button onClick={() => setConfirming(false)} className="text-stone-600 hover:text-stone-900">
        {keep}
      </button>
      {error && <span className="w-full text-red-700">{error}</span>}
    </div>
  );
}

export function CancelButton({ token, t }: { token: string; t: T }) {
  const router = useRouter();
  return (
    <ConfirmAction
      label={t.cancel}
      question={t.cancelConfirm}
      yes={t.cancelYes}
      working={t.cancelling}
      keep={t.keep}
      run={async () => {
        const result = await cancelBooking(token);
        if (result.ok) {
          router.refresh();
          return null;
        }
        return result.error === "too_late" ? t.tooLate : t.notFound;
      }}
    />
  );
}

export function DeleteDataButton({ token, t }: { token: string; t: T }) {
  const router = useRouter();
  return (
    <ConfirmAction
      label={t.deleteButton}
      question={t.deleteConfirm}
      yes={t.deleteYes}
      working={t.deleting}
      keep={t.keep}
      run={async () => {
        const result = await deleteMyData(token);
        if (result.ok) {
          router.refresh();
          return null;
        }
        return t.notFound;
      }}
    />
  );
}
