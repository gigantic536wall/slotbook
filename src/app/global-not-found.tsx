import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = { title: "404 · Page not found" };

/** Shown for URLs that match no route at all (the app has two root layouts: site and admin). */
export default function GlobalNotFound() {
  return (
    <html lang="en" className={`${GeistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full items-center justify-center font-sans">
        <div className="px-4 text-center">
          <p className="text-6xl font-semibold text-stone-300">404</p>
          <h1 className="mt-4 text-2xl font-semibold">Page not found · Seite nicht gefunden</h1>
          <Link href="/" className="mt-6 inline-block rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white">
            Home · Startseite
          </Link>
        </div>
      </body>
    </html>
  );
}
