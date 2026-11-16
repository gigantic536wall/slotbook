import Link from "next/link";

// not-found.tsx receives no params, so this page shows both languages.
export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <p className="text-6xl font-semibold text-stone-300">404</p>
      <h1 className="mt-4 text-2xl font-semibold">Page not found · Seite nicht gefunden</h1>
      <p className="mt-2 text-stone-500">
        The page you are looking for does not exist. · Die gesuchte Seite existiert nicht.
      </p>
      <Link href="/" className="mt-6 inline-block rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white">
        Home · Startseite
      </Link>
    </div>
  );
}
