"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Une erreur est survenue</h1>
      <p className="mt-3 text-ink-600">La page n&apos;a pas pu être affichée. Réessayez dans un instant.</p>
      <button onClick={reset} className="mt-6 rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white">Réessayer</button>
    </div>
  );
}
