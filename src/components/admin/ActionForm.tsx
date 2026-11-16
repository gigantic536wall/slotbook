"use client";

import { startTransition, useActionState } from "react";
import type { ActionState } from "@/app/admin/actions";

type Props = {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  submitLabel: string;
  className?: string;
  children: React.ReactNode;
};

/** A form bound to a Server Action that shows the action's success or error message. */
export function ActionForm({ action, submitLabel, className, children }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form
      // Submitting through onSubmit keeps what the user typed: React resets forms after an action,
      // which would wipe all edits when there is a validation error.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
      className={className}
    >
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-stone-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        {state.message && (
          <p role="status" className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-600"}`}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}

export const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400";
