"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { LOCALES, type Locale } from "@/i18n";

type Props = { current: Locale; label: string };

/** Links to the same page in the other language, e.g. /en/book → /de/book. */
export function LanguageSwitcher(props: Props) {
  // On pages with request-time URLs (e.g. booking links) the path is only known per request,
  // so the static shell shows links to the home pages until it is.
  return (
    <Suspense fallback={<Links {...props} rest="" />}>
      <CurrentPathLinks {...props} />
    </Suspense>
  );
}

function CurrentPathLinks(props: Props) {
  const rest = usePathname().split("/").slice(2).join("/");
  return <Links {...props} rest={rest} />;
}

function Links({ current, label, rest }: Props & { rest: string }) {
  return (
    <nav aria-label={label} className="flex rounded-full border border-stone-200 p-0.5 text-xs font-medium">
      {LOCALES.map((l) => (
        <Link
          key={l}
          href={`/${l}${rest ? `/${rest}` : ""}`}
          hrefLang={l}
          aria-current={l === current ? "true" : undefined}
          className={`rounded-full px-2.5 py-1 uppercase ${l === current ? "bg-stone-900 text-white" : "text-stone-500 hover:text-stone-900"}`}
        >
          {l}
        </Link>
      ))}
    </nav>
  );
}
