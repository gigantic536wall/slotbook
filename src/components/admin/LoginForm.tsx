"use client";

import { useActionState } from "react";
import { login } from "@/app/admin/actions";
import { inputClass } from "./ActionForm";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, {});
  return (
    <form action={action} className="mt-6 grid gap-4">
      <input type="hidden" name="next" value={next} />
      <label className="text-sm font-medium">
        Email
        <input name="email" type="email" required autoComplete="username" className={inputClass} />
      </label>
      <label className="text-sm font-medium">
        Password
        <input name="password" type="password" required autoComplete="current-password" className={inputClass} />
      </label>
      {state.message && (
        <p role="alert" className="text-sm text-red-600">
          {state.message}
        </p>
      )}
      <button
        disabled={pending}
        className="rounded-full bg-stone-900 px-5 py-2.5 font-medium text-white transition hover:bg-stone-700 disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
