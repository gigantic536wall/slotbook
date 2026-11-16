import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import Link from "next/link";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "Admin · SlotBook", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

/** Root layout of the admin area (the public site has its own, per language). */
export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="border-b border-stone-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <span className="text-lg font-semibold tracking-tight">✂️ Northside Barbers</span>
            <Link href="/" className="text-sm text-stone-500 hover:text-stone-900">
              View site →
            </Link>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
