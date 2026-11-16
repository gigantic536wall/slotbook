import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/admin/LoginForm";
import { DEMO_ADMIN } from "@/lib/demo-data";

const DEMO = process.env.DEMO_MODE === "1";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false } };

export default function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Admin sign in</h1>
      <p className="mt-1 text-sm text-stone-500">For the shop owner and staff.</p>
      {DEMO && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">This is a public demo 👋</p>
          <p className="mt-1">
            Sign in with <b>{DEMO_ADMIN.email}</b> / <b>{DEMO_ADMIN.password}</b> (already filled in). Feel free to change
            anything: all data is reset every night.
          </p>
        </div>
      )}
      <Suspense>
        <Form searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Form({ searchParams }: Pick<PageProps<"/admin/login">, "searchParams">) {
  const { next } = await searchParams;
  return <LoginForm next={typeof next === "string" ? next : ""} demo={DEMO ? DEMO_ADMIN : undefined} />;
}
