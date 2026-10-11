import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { getViewer } from "@/lib/viewer";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: { default: "Bac SES — Sujets, grilles et corrigés", template: "%s · Bac SES" },
  description:
    "Les sujets du bac de SES (Terminale) et leurs corrigés au même endroit : énoncés officiels, éléments de correction officiels, corrigés détaillés et sources vérifiables.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0e1a" },
  ],
};

// Applique le thème avant l'hydratation pour éviter un flash.
const themeScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">
        <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">
          Aller au contenu
        </a>
        <header className="sticky top-0 z-30 border-b border-ink-200/70 bg-ink-50/85 backdrop-blur-md dark:border-ink-800 dark:bg-ink-950/80">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
            <Link href="/" className="focus-ring flex items-center gap-2.5 rounded-lg">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-sm font-black text-white shadow-sm shadow-brand-600/30">SES</span>
              <span className="hidden font-semibold leading-tight sm:block">
                Bac SES
                <span className="block text-xs font-normal text-ink-500 dark:text-ink-400">Sujets & corrigés</span>
              </span>
            </Link>
            <nav aria-label="Navigation principale" className="flex items-center gap-1 text-sm font-medium">
              <Link className="focus-ring rounded-lg px-3 py-2 hover:bg-ink-100 dark:hover:bg-ink-800" href="/chapitres">Chapitres</Link>
              <Link className="focus-ring rounded-lg px-3 py-2 hover:bg-ink-100 dark:hover:bg-ink-800" href="/chapitres/croissance">Sujets</Link>
              <Link className="focus-ring hidden rounded-lg px-3 py-2 hover:bg-ink-100 sm:block dark:hover:bg-ink-800" href="/methode">Méthode</Link>
              <Link
                className="focus-ring ml-1 rounded-lg bg-ink-900 px-3 py-2 text-white hover:bg-ink-800 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-200"
                href="/premium"
              >
                {viewer.tier === "premium" ? "Premium ✓" : "Premium"}
              </Link>
              <ThemeToggle />
            </nav>
          </div>
        </header>
        <main id="contenu">{children}</main>
        <footer className="mt-24 border-t border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-ink-600 sm:grid-cols-3 sm:px-6 dark:text-ink-400">
            <div>
              <p className="font-semibold text-ink-900 dark:text-white">Bac SES — Sujets & corrigés</p>
              <p className="mt-2">
                Projet indépendant, non affilié au ministère de l&apos;Éducation nationale ni à l&apos;académie de Versailles. Les
                énoncés renvoient toujours à leur source.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Link className="hover:underline" href="/sources">Sources et limites</Link>
              <Link className="hover:underline" href="/inventaire">Inventaire des sujets</Link>
              <Link className="hover:underline" href="/methode">Les 4 exercices et le barème 2027</Link>
            </div>
            <p>
              Les corrigés sont des contenus pédagogiques originaux. Un statut indique pour chacun s&apos;il a été contrôlé
              automatiquement ou validé par un enseignant. Aucun corrigé ne garantit une note.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
