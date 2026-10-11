import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SubjectBrowser } from "@/components/SubjectBrowser";
import { getChapter, getChapters, getSubjectSummaries } from "@/lib/data";
import { FIELD_LABEL } from "@/lib/labels";

export function generateStaticParams() {
  return getChapters().map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const c = getChapter(id);
  return { title: c ? c.shortTitle : "Chapitre" };
}

export default async function ChapterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const chapter = getChapter(id);
  if (!chapter) notFound();

  if (chapter.status !== "published") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <p className="text-sm font-semibold text-ink-500">Chapitre {chapter.number} · Bientôt disponible</p>
        <h1 className="mt-2 text-3xl font-bold">{chapter.title}</h1>
        <p className="mt-4 text-ink-600 dark:text-ink-400">
          Ce chapitre n&apos;est pas encore traité. Aucun sujet ni corrigé n&apos;est publié pour l&apos;instant.
        </p>
        <Link href="/chapitres/croissance" className="mt-8 inline-block font-semibold text-brand-700 hover:underline dark:text-brand-300">
          Voir le chapitre disponible : Croissance économique →
        </Link>
      </div>
    );
  }

  const subjects = getSubjectSummaries(chapter.id);
  const withAnswer = subjects.filter((s) => s.hasAnswer).length;
  const withGrid = subjects.filter((s) => s.gridStatus === "correspondance_verifiee").length;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <nav aria-label="Fil d'Ariane" className="text-sm text-ink-500">
        <Link href="/chapitres" className="hover:underline">Chapitres</Link> <span aria-hidden>›</span> {FIELD_LABEL[chapter.field]}
      </nav>
      <header className="mt-3 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">Chapitre {chapter.number}</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-ink-950 sm:text-4xl dark:text-white">{chapter.title}</h1>
          <p className="mt-3 max-w-3xl text-ink-600 dark:text-ink-300">{chapter.summary}</p>
        </div>
        <dl className="grid grid-cols-3 gap-2 text-center">
          {[
            [subjects.length, "questions"],
            [withGrid, "corrigés officiels"],
            [withAnswer, "corrigés rédigés"],
          ].map(([n, l]) => (
            <div key={String(l)} className="rounded-xl bg-white px-4 py-3 ring-1 ring-ink-200 dark:bg-ink-900 dark:ring-ink-800">
              <dd className="text-xl font-bold tabular-nums">{n}</dd>
              <dt className="text-xs text-ink-500">{l}</dt>
            </div>
          ))}
        </dl>
      </header>
      <Suspense>
        <SubjectBrowser subjects={subjects} />
      </Suspense>
    </div>
  );
}
