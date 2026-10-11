import Link from "next/link";
import type { Metadata } from "next";
import { ArrowIcon, SectionTitle } from "@/components/ui";
import { getChapters } from "@/lib/data";
import { FIELD_LABEL } from "@/lib/labels";
import type { ProgramField } from "@/lib/types";

export const metadata: Metadata = { title: "Chapitres du programme" };

const FIELDS: ProgramField[] = ["science-economique", "sociologie-science-politique", "regards-croises"];

export default function ChaptersPage() {
  const chapters = getChapters();
  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
      <SectionTitle eyebrow="Programme de Terminale" title="Les 9 questions évaluables à l'écrit">
        Liste fixée par l&apos;annexe I de la note de service du 11 septembre 2026 (BO spécial n° 4), applicable à partir de la
        session 2027. Les autres questions du programme de Terminale ne sont pas évaluées à l&apos;écrit.
      </SectionTitle>
      <div className="mt-10 space-y-10">
        {FIELDS.map((f) => (
          <section key={f} aria-labelledby={`f-${f}`}>
            <h2 id={`f-${f}`} className="text-sm font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">
              {FIELD_LABEL[f]}
            </h2>
            <ul className="mt-3 grid gap-3 md:grid-cols-2">
              {chapters
                .filter((c) => c.field === f)
                .map((c) => (
                  <li key={c.id}>
                    {c.status === "published" ? (
                      <Link
                        href={`/chapitres/${c.id}`}
                        className="focus-ring group flex h-full items-start justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm ring-2 ring-brand-500 transition hover:-translate-y-0.5 dark:bg-ink-900"
                      >
                        <div>
                          <p className="text-xs font-semibold text-brand-700 dark:text-brand-300">Chapitre {c.number} · Disponible</p>
                          <p className="mt-1 font-semibold text-ink-950 dark:text-white">{c.title}</p>
                          <p className="mt-2 text-sm text-ink-600 dark:text-ink-400">{c.subjectCount} questions d&apos;examen recensées</p>
                        </div>
                        <ArrowIcon className="mt-1 h-5 w-5 shrink-0 text-brand-600 transition group-hover:translate-x-0.5" />
                      </Link>
                    ) : (
                      <div className="flex h-full items-start justify-between gap-4 rounded-2xl bg-ink-100/60 p-5 ring-1 ring-ink-200 dark:bg-ink-900/40 dark:ring-ink-800" aria-disabled="true">
                        <div>
                          <p className="text-xs font-semibold text-ink-500">Chapitre {c.number} · Bientôt disponible</p>
                          <p className="mt-1 font-medium text-ink-600 dark:text-ink-400">{c.title}</p>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
