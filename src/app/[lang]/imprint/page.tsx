import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n";
import { getCatalog } from "@/lib/catalog";

// German law (§ 5 DDG) requires an "Impressum" on business websites.
const text = {
  en: {
    title: "Imprint",
    demo: "Demo project: the company and details below are fictional.",
    owner: "Responsible",
    contact: "Contact",
    vat: "VAT ID",
    dispute:
      "We are not willing or obliged to take part in dispute resolution proceedings before a consumer arbitration board.",
  },
  de: {
    title: "Impressum",
    demo: "Demoprojekt: Firma und Angaben unten sind frei erfunden.",
    owner: "Verantwortlich",
    contact: "Kontakt",
    vat: "USt-IdNr.",
    dispute:
      "Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.",
  },
};

export async function generateMetadata({ params }: PageProps<"/[lang]/imprint">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: text[lang].title } : {};
}

export default async function ImprintPage({ params }: PageProps<"/[lang]/imprint">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = text[lang];
  const { business } = await getCatalog();
  return (
    <article className="mx-auto max-w-2xl space-y-4 px-4 py-10 text-stone-700">
      <h1 className="text-3xl font-semibold tracking-tight text-stone-900">{t.title}</h1>
      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{t.demo}</p>
      <section>
        <h2 className="text-lg font-semibold text-stone-900">{t.owner}</h2>
        <p>
          {business.name} (Max Mustermann)
          <br />
          {business.address}
        </p>
      </section>
      <section>
        <h2 className="text-lg font-semibold text-stone-900">{t.contact}</h2>
        <p>
          {business.phone}
          <br />
          {business.email}
        </p>
      </section>
      <section>
        <h2 className="text-lg font-semibold text-stone-900">{t.vat}</h2>
        <p>DE000000000</p>
      </section>
      <p className="text-sm">{t.dispute}</p>
    </article>
  );
}
