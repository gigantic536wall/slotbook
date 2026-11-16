import type { Metadata } from "next";
// Self-hosted fonts: no request to Google at build or run time (also better for GDPR).
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Northside Barbers · Book online", template: "%s · Northside Barbers" },
  description: "Book your haircut or beard trim online in seconds. Demo of SlotBook, an online booking system.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="border-b border-stone-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              ✂️ Northside Barbers
            </Link>
            <Link
              href="/book"
              className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700"
            >
              Book now
            </Link>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-stone-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-stone-500">
            Demo project · Built with SlotBook (Next.js, PostgreSQL)
          </div>
        </footer>
      </body>
    </html>
  );
}
