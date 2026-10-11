import Link from "next/link";
import { ArrowIcon, ButtonLink, Card, ExerciseBadge, LockIcon, SectionTitle } from "@/components/ui";
import { getChapters, getSubjectSummaries } from "@/lib/data";
import { EXERCISE_LABEL, EXERCISE_ORDER } from "@/lib/labels";

export default function HomePage() {
  const chapters = getChapters();
  const live = chapters.filter((c) => c.status === "published");
  const subjects = getSubjectSummaries("croissance");
  const withAnswer = subjects.filter((s) => s.hasAnswer).length;
  const withGrid = subjects.filter((s) => s.gridStatus === "correspondance_verifiee").length;
  const counts = Object.fromEntries(EXERCISE_ORDER.map((t) => [t, subjects.filter((s) => s.exerciseType === t).length]));
  const years = subjects.map((s) => s.year);
  const range = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : "";

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60rem_30rem_at_70%_-10%,var(--color-brand-100),transparent)] dark:bg-[radial-gradient(60rem_30rem_at_70%_-10%,color-mix(in_oklab,var(--color-brand-900)_60%,transparent),transparent)]" />
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
          <p className="inline-flex animate-fade-up items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 dark:bg-ink-900 dark:text-brand-200 dark:ring-brand-800">
            Bac SES · Terminale · épreuve écrite
          </p>
          <h1 className="mt-5 max-w-3xl animate-fade-up text-4xl font-black tracking-tight text-ink-950 sm:text-6xl dark:text-white">
            Les sujets tombés au bac et leurs corrigés, <span className="text-brand-600 dark:text-brand-300">au même endroit.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-600 dark:text-ink-300">
            Chaque question est reliée à son énoncé officiel, au corrigé officiel transmis aux correcteurs quand il a été
            retrouvé, et à un corrigé détaillé vérifié élément par élément. Les sources sont toujours citées.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/chapitres/croissance">
              Voir les sujets « Croissance » <ArrowIcon />
            </ButtonLink>
            <ButtonLink href="/methode" variant="secondary">
              Comprendre les 4 exercices
            </ButtonLink>
          </div>
          <dl className="mt-12 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              [String(subjects.length), "questions recensées"],
              [String(withGrid), "avec corrigé officiel retrouvé"],
              [String(withAnswer), "corrigés rédigés"],
              [range, "sessions couvertes"],
            ].map(([n, l]) => (
              <div key={l} className="rounded-2xl bg-white/70 p-4 ring-1 ring-ink-200/70 dark:bg-ink-900/70 dark:ring-ink-800">
                <dt className="text-xs text-ink-500 dark:text-ink-400">{l}</dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums text-ink-950 dark:text-white">{n}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Chapitre disponible */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionTitle eyebrow="Version 1" title="Un premier chapitre, traité à fond">
          Plutôt que neuf chapitres survolés, la première version couvre entièrement le chapitre 1 de science
          économique. Les huit autres chapitres évaluables à l&apos;écrit arriveront ensuite.
        </SectionTitle>
        <div className="mt-8 grid gap-4 md:grid-cols-[1.4fr_1fr]">
          {live.map((c) => (
            <Link
              key={c.id}
              href={`/chapitres/${c.id}`}
              className="focus-ring group rounded-3xl bg-ink-950 p-7 text-white shadow-lg shadow-ink-900/10 transition hover:-translate-y-0.5 dark:bg-brand-900/40 dark:ring-1 dark:ring-brand-800"
            >
              <p className="text-sm font-medium text-brand-200">Chapitre {c.number} · Science économique</p>
              <h3 className="mt-2 text-2xl font-bold">{c.title}</h3>
              <p className="mt-3 text-ink-300">{c.summary}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {EXERCISE_ORDER.map((t) => (
                  <span key={t} className="rounded-full bg-white/10 px-3 py-1 text-sm">
                    {EXERCISE_LABEL[t].short} · {counts[t]}
                  </span>
                ))}
              </div>
              <span className="mt-6 inline-flex items-center gap-2 font-semibold text-brand-200 group-hover:gap-3">
                Explorer les {c.subjectCount} sujets <ArrowIcon />
              </span>
            </Link>
          ))}
          <Card className="flex flex-col justify-between">
            <div>
              <p className="text-sm font-semibold text-ink-500 dark:text-ink-400">Bientôt disponibles</p>
              <ul className="mt-3 space-y-2 text-sm text-ink-700 dark:text-ink-300">
                {chapters
                  .filter((c) => c.status !== "published")
                  .map((c) => (
                    <li key={c.id} className="flex items-start gap-2">
                      <span className="mt-0.5 text-xs tabular-nums text-ink-400">{c.number}.</span>
                      <span>{c.shortTitle}</span>
                    </li>
                  ))}
              </ul>
            </div>
            <Link href="/chapitres" className="mt-4 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300">
              Voir le programme →
            </Link>
          </Card>
        </div>
      </section>

      {/* Types d'exercices */}
      <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
        <SectionTitle eyebrow="Les 4 formats de l'écrit" title="Chaque exercice a ses propres attentes">
          Les sujets sont classés selon les quatre formats de l&apos;épreuve. Chaque corrigé respecte le format et le niveau
          de détail attendus pour son exercice.
        </SectionTitle>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {EXERCISE_ORDER.map((t) => (
            <Link key={t} href={`/chapitres/croissance?type=${t}`} className="focus-ring group rounded-2xl">
              <Card className="h-full transition group-hover:ring-brand-300 dark:group-hover:ring-brand-700">
                <ExerciseBadge type={t} size="md" />
                <h3 className="mt-3 font-semibold text-ink-950 dark:text-white">{EXERCISE_LABEL[t].long}</h3>
                <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">{EXERCISE_LABEL[t].hint}</p>
                <p className="mt-4 text-sm font-medium text-brand-700 dark:text-brand-300">{counts[t]} sujets →</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Fonctionnalités */}
      <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
        <SectionTitle eyebrow="Pourquoi cette plateforme" title="Fiable avant d'être joli" />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Une question = une fiche", "Chaque question a son identifiant officiel (ex. 22-SESJ1ME1-EC2). Deux sujets qui se ressemblent ne sont jamais fusionnés : leurs différences sont expliquées."],
            ["Le corrigé officiel comme référence", "Quand le document de correction officiel a été retrouvé, ses éléments attendus servent à vérifier le corrigé, point par point."],
            ["Des statuts transparents", "« Vérifié automatiquement » n'est pas « validé par un enseignant ». Les manques et les incertitudes sont affichés, pas cachés."],
          ].map(([t, d]) => (
            <Card key={t}>
              <h3 className="font-semibold text-ink-950 dark:text-white">{t}</h3>
              <p className="mt-2 text-sm text-ink-600 dark:text-ink-400">{d}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Gratuit / Premium */}
      <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
        <SectionTitle eyebrow="Accès" title="Gratuit pour découvrir, Premium pour tout réviser" />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Card>
            <h3 className="text-lg font-semibold">Gratuit</h3>
            <ul className="mt-3 space-y-2 text-sm text-ink-700 dark:text-ink-300">
              <li>✓ Tous les énoncés, la recherche et les filtres</li>
              <li>✓ Les liens vers les documents officiels et les corrigés officiels</li>
              <li>✓ Une sélection de corrigés détaillés complets</li>
              <li>✓ Les relations entre sujets proches</li>
            </ul>
          </Card>
          <Card className="ring-2 ring-brand-500 dark:ring-brand-400">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <LockIcon className="h-4 w-4 text-brand-600" /> Premium
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-ink-700 dark:text-ink-300">
              <li>✓ Tous les corrigés détaillés</li>
              <li>✓ Les tableaux de vérification face à la grille</li>
              <li>✓ À venir : progression, favoris, fiches de notions</li>
            </ul>
            <p className="mt-4 text-xs text-ink-500">Paiement non activé dans cette version : un accès de démonstration est disponible.</p>
          </Card>
        </div>
      </section>
    </>
  );
}
