import type { Metadata } from "next";
// Self-hosted fonts: no request to Google at build or run time (also better for GDPR).
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getDictionary, hasLocale, LOCALES } from "@/i18n";
import "../globals.css";

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = getDictionary(lang);
  return {
    title: { default: dict.meta.title, template: `%s · Northside Barbers` },
    description: dict.meta.description,
    alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `/${l}`])) },
  };
}

export default async function SiteLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = getDictionary(lang);

  return (
    <html lang={lang} className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="border-b border-stone-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4">
            <Link href={`/${lang}`} className="text-lg font-semibold tracking-tight">
              ✂️ Northside Barbers
            </Link>
            <div className="flex items-center gap-3">
              <LanguageSwitcher current={lang} label={dict.nav.language} />
              <Link
                href={`/${lang}/book`}
                className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700"
              >
                {dict.nav.bookNow}
              </Link>
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-stone-200 bg-white">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-6 text-sm text-stone-500">
            <span>{dict.footer.demo}</span>
            <Link href={`/${lang}/privacy`} className="hover:text-stone-900">
              {dict.footer.privacy}
            </Link>
            <Link href={`/${lang}/imprint`} className="hover:text-stone-900">
              {dict.footer.imprint}
            </Link>
            <span className="w-full text-xs">{dict.footer.cookies}</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
