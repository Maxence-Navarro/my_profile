import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-sm font-semibold text-brand-700">Erreur 404</p>
      <h1 className="mt-2 text-3xl font-bold">Page introuvable</h1>
      <p className="mt-3 text-ink-600 dark:text-ink-400">Ce sujet ou cette page n&apos;existe pas (ou plus).</p>
      <Link href="/chapitres/croissance" className="mt-6 inline-block font-semibold text-brand-700 hover:underline">
        Voir les sujets disponibles →
      </Link>
    </div>
  );
}
