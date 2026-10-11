"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { EXERCISE_LABEL, EXERCISE_ORDER, GRID_LABEL, PEDAGOGICAL_LABEL } from "@/lib/labels";
import { filterSubjects, type SubjectFilters } from "@/lib/filter";
import type { ExerciseType, SubjectSummary } from "@/lib/types";
import { cx, ExerciseBadge, LockIcon, Pill } from "./ui";

export function SubjectBrowser({ subjects }: { subjects: SubjectSummary[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initialType = params.get("type");
  const [filters, setFilters] = useState<SubjectFilters>({
    type: EXERCISE_ORDER.includes(initialType as ExerciseType) ? (initialType as ExerciseType) : "all",
    year: params.get("annee") ? Number(params.get("annee")) : "all",
    query: params.get("q") ?? "",
    onlyWithAnswer: params.get("corrige") === "1",
  });

  function update(next: Partial<SubjectFilters>) {
    const f = { ...filters, ...next };
    setFilters(f);
    const sp = new URLSearchParams();
    if (f.type !== "all") sp.set("type", f.type);
    if (f.year !== "all") sp.set("annee", String(f.year));
    if (f.query) sp.set("q", f.query);
    if (f.onlyWithAnswer) sp.set("corrige", "1");
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const years = useMemo(() => [...new Set(subjects.map((s) => s.year))].sort((a, b) => b - a), [subjects]);
  const results = useMemo(() => filterSubjects(subjects, filters), [subjects, filters]);
  const countByType = useMemo(
    () => Object.fromEntries(EXERCISE_ORDER.map((t) => [t, filterSubjects(subjects, { ...filters, type: t }).length])),
    [subjects, filters],
  );

  return (
    <section className="mt-8" aria-label="Sujets du chapitre">
      <div className="sticky top-16 z-20 -mx-4 border-b border-ink-200/70 bg-ink-50/90 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:px-4 dark:border-ink-800 dark:bg-ink-950/85">
        <div role="tablist" aria-label="Type d'exercice" className="-mx-1 flex gap-1 overflow-x-auto pb-1">
          <TypeTab active={filters.type === "all"} onClick={() => update({ type: "all" })}>
            Tous <span className="tabular-nums opacity-70">{filterSubjects(subjects, { ...filters, type: "all" }).length}</span>
          </TypeTab>
          {EXERCISE_ORDER.map((t) => (
            <TypeTab key={t} active={filters.type === t} onClick={() => update({ type: t })} title={EXERCISE_LABEL[t].long}>
              {EXERCISE_LABEL[t].short} <span className="tabular-nums opacity-70">{countByType[t]}</span>
            </TypeTab>
          ))}
        </div>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Rechercher un sujet</span>
            <input
              type="search"
              value={filters.query}
              onChange={(e) => update({ query: e.target.value })}
              placeholder="Rechercher : PGF, droits de propriété, Asie, 2023…"
              className="focus-ring w-full rounded-xl border-0 bg-white px-4 py-2.5 text-sm ring-1 ring-ink-200 placeholder:text-ink-400 dark:bg-ink-900 dark:ring-ink-700"
            />
          </label>
          <div className="flex gap-2">
            <label className="flex-1 sm:flex-none">
              <span className="sr-only">Année</span>
              <select
                value={String(filters.year)}
                onChange={(e) => update({ year: e.target.value === "all" ? "all" : Number(e.target.value) })}
                className="focus-ring w-full rounded-xl border-0 bg-white px-3 py-2.5 text-sm ring-1 ring-ink-200 dark:bg-ink-900 dark:ring-ink-700"
              >
                <option value="all">Toutes les années</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-xl bg-white px-3 text-sm ring-1 ring-ink-200 dark:bg-ink-900 dark:ring-ink-700">
              <input type="checkbox" checked={filters.onlyWithAnswer} onChange={(e) => update({ onlyWithAnswer: e.target.checked })} className="accent-brand-600" />
              Avec corrigé
            </label>
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm text-ink-500" aria-live="polite" data-testid="result-count">
        {results.length} sujet{results.length > 1 ? "s" : ""} affiché{results.length > 1 ? "s" : ""}
      </p>

      {results.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-ink-300 p-10 text-center text-ink-500 dark:border-ink-700">
          Aucun sujet ne correspond à ces critères.{" "}
          <button className="font-semibold text-brand-700 underline dark:text-brand-300" onClick={() => update({ type: "all", year: "all", query: "", onlyWithAnswer: false })}>
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <ul className="mt-3 grid gap-3" data-testid="subject-list">
          {results.map((s) => (
            <li key={s.id}>
              <SubjectCard s={s} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TypeTab({ active, onClick, children, title }: { active: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      title={title}
      onClick={onClick}
      className={cx(
        "focus-ring shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold transition",
        active ? "bg-ink-900 text-white dark:bg-white dark:text-ink-900" : "text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800",
      )}
    >
      {children}
    </button>
  );
}

function SubjectCard({ s }: { s: SubjectSummary }) {
  return (
    <Link
      href={`/sujets/${s.slug}`}
      data-type={s.exerciseType}
      className="focus-ring group block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-ink-200/70 transition hover:ring-brand-300 sm:p-5 dark:bg-ink-900 dark:ring-ink-800 dark:hover:ring-brand-700"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500 dark:text-ink-400">
        <ExerciseBadge type={s.exerciseType} />
        <span className="font-semibold text-ink-700 dark:text-ink-200">{s.year}</span>
        <span>·</span>
        <span>{s.center}</span>
        {s.session !== "normale" && <span className="rounded bg-ink-100 px-1.5 dark:bg-ink-800">{s.session}</span>}
        <span className="ml-auto font-mono text-[11px] text-ink-400">{s.examCode}</span>
      </div>
      <p className="mt-2 font-medium leading-snug text-ink-950 group-hover:text-brand-800 dark:text-white dark:group-hover:text-brand-200">
        {s.question}
      </p>
      {s.subQuestions.length > 0 && (
        <p className="mt-1 line-clamp-2 text-sm text-ink-600 dark:text-ink-400">{s.subQuestions.map((q) => `${q.n}. ${q.text}`).join("  ")}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Pill tone={PEDAGOGICAL_LABEL[s.pedagogicalStatus].tone}>{PEDAGOGICAL_LABEL[s.pedagogicalStatus].label}</Pill>
        <Pill tone={GRID_LABEL[s.gridStatus].tone}>{GRID_LABEL[s.gridStatus].label}</Pill>
        {s.hasAnswer && s.accessTier === "premium" && (
          <Pill tone="info" icon={<LockIcon className="h-3 w-3" />}>
            Premium
          </Pill>
        )}
        {s.hasAnswer && s.accessTier === "free" && <Pill tone="ok">Corrigé gratuit</Pill>}
      </div>
    </Link>
  );
}
