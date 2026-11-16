import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n";
import { RETENTION_DAYS } from "@/lib/gdpr";

const months = Math.round(RETENTION_DAYS / 30.4);

const content: Record<Locale, { title: string; demo: string; sections: [string, string][] }> = {
  en: {
    title: "Privacy policy",
    demo: "This is a demo project. The text below is a sample and not legal advice.",
    sections: [
      [
        "What we collect",
        "When you book, we store your name, email address, optional phone number and note, the chosen service, barber and time, and the moment you gave consent.",
      ],
      ["Why", "Only to manage your appointment (Art. 6(1)(b) GDPR). We do not sell your data or use it for advertising."],
      [
        "How long",
        `Personal data is deleted automatically ${months} months after the appointment. Only the anonymous time and price stay for statistics.`,
      ],
      [
        "Cookies and tracking",
        "We do not use analytics, ads or tracking. The only cookie is the sign-in cookie of the staff admin panel, which is technically necessary. Fonts are hosted on our own server.",
      ],
      [
        "Your rights",
        "You can delete your personal data yourself on your appointment page (the link you got after booking). You can also request access, correction or deletion by writing to the email address on our home page.",
      ],
    ],
  },
  de: {
    title: "Datenschutzerklärung",
    demo: "Dies ist ein Demoprojekt. Der folgende Text ist ein Beispiel und keine Rechtsberatung.",
    sections: [
      [
        "Welche Daten wir erheben",
        "Bei einer Buchung speichern wir Ihren Namen, Ihre E-Mail-Adresse, optional Telefonnummer und Hinweis, die gewählte Leistung, den Barbier, die Uhrzeit sowie den Zeitpunkt Ihrer Einwilligung.",
      ],
      [
        "Zweck",
        "Ausschließlich zur Verwaltung Ihres Termins (Art. 6 Abs. 1 lit. b DSGVO). Wir verkaufen Ihre Daten nicht und nutzen sie nicht für Werbung.",
      ],
      [
        "Speicherdauer",
        `Personenbezogene Daten werden ${months} Monate nach dem Termin automatisch gelöscht. Nur anonyme Zeit- und Preisangaben bleiben für Statistiken erhalten.`,
      ],
      [
        "Cookies und Tracking",
        "Wir verwenden keine Analyse-, Werbe- oder Tracking-Dienste. Das einzige Cookie ist das technisch notwendige Anmelde-Cookie des Admin-Bereichs für Mitarbeiter. Schriftarten liegen auf unserem eigenen Server.",
      ],
      [
        "Ihre Rechte",
        "Sie können Ihre Daten jederzeit selbst auf Ihrer Terminseite löschen (der Link, den Sie nach der Buchung erhalten haben). Auskunft, Berichtigung oder Löschung können Sie auch per E-Mail an die Adresse auf unserer Startseite verlangen.",
      ],
    ],
  },
};

export async function generateMetadata({ params }: PageProps<"/[lang]/privacy">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: content[lang].title } : {};
}

export default async function PrivacyPage({ params }: PageProps<"/[lang]/privacy">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const c = content[lang];
  return (
    <article className="mx-auto max-w-2xl space-y-4 px-4 py-10 text-stone-700">
      <h1 className="text-3xl font-semibold tracking-tight text-stone-900">{c.title}</h1>
      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{c.demo}</p>
      {c.sections.map(([heading, text]) => (
        <section key={heading}>
          <h2 className="pt-2 text-lg font-semibold text-stone-900">{heading}</h2>
          <p className="mt-1">{text}</p>
        </section>
      ))}
    </article>
  );
}
