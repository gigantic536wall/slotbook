import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/app/admin/actions";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: "Schedule" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/staff", label: "Staff" },
] as const;

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <nav className="mb-6 flex flex-wrap items-center gap-1 border-b border-stone-200 pb-3 text-sm">
        <span className="mr-3 rounded bg-stone-900 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
          Admin
        </span>
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="rounded-lg px-3 py-1.5 font-medium hover:bg-stone-100">
            {n.label}
          </Link>
        ))}
        <form action={logout} className="ml-auto">
          <button className="rounded-lg px-3 py-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900">Sign out</button>
        </form>
      </nav>
      {children}
    </div>
  );
}
