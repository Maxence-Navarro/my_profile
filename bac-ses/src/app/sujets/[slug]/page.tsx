import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/Reveal";
import { Card, ExerciseBadge, GridPill, LockIcon, PedagogicalPill, Pill } from "@/components/ui";
import { getAnswerForViewer } from "@/lib/access";
import { getChapter, getSubject } from "@/lib/data";
import { EXERCISE_LABEL, SIMILARITY_LABEL, VERIFICATION_LABEL } from "@/lib/labels";
import { renderMarkdown } from "@/lib/markdown";
import { getViewer } from "@/lib/viewer";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = getSubject(slug);
  if (!s) return { title: "Sujet introuvable" };
  return {
    title: `${EXERCISE_LABEL[s.exerciseType].short} ${s.year} ${s.center} — ${s.question.slice(0, 70)}`,
    description: `Sujet ${s.examCode} (${s.year}, ${s.center}) : énoncé, corrigé officiel et corrigé détaillé.`,
  };
}

// Le rendu dépend du cookie de session (droits d'accès) : jamais mis en cache statique.
export const dynamic = "force-dynamic";

export default async function SubjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = getSubject(slug);
  if (!s) notFound();
  const chapter = getChapter(s.chapterId);
  const viewer = await getViewer();
  const answer = getAnswerForViewer(s, viewer);

  return (
    <article className="mx-auto max-w-3xl px-4 pt-8 sm:px-6">
      <nav aria-label="Fil d'Ariane" className="text-sm text-ink-500">
        <Link href="/chapitres" className="hover:underline">Chapitres</Link> <span aria-hidden>›</span>{" "}
        <Link href={`/chapitres/${s.chapterId}`} className="hover:underline">{chapter?.shortTitle}</Link> <span aria-hidden>›</span>{" "}
        <Link href={`/chapitres/${s.chapterId}?type=${s.exerciseType}`} className="hover:underline">{EXERCISE_LABEL[s.exerciseType].short}</Link>
      </nav>

      {/* 1-2. Titre, référence, année, session, type */}
      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <ExerciseBadge type={s.exerciseType} size="md" />
          <span className="text-sm text-ink-600 dark:text-ink-400">{EXERCISE_LABEL[s.exerciseType].long}</span>
        </div>
        <h1 className="mt-3 text-2xl font-bold leading-snug tracking-tight text-ink-950 sm:text-3xl dark:text-white">{s.question}</h1>
        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 rounded-2xl bg-white p-4 text-sm ring-1 ring-ink-200 sm:grid-cols-4 dark:bg-ink-900 dark:ring-ink-800">
          <Meta label="Session" value={`${s.year} · ${s.session}`} />
          <Meta label="Centre" value={s.center} />
          <Meta label="Jour" value={s.day ?? "—"} />
          <Meta label="Code officiel" value={<span className="font-mono">{s.examCode}{s.variant ? ` · sujet ${s.variant}` : ""}</span>} />
          <Meta label="Barème d'origine" value={s.points != null ? `${s.points} points` : "—"} />
          <Meta label="Verbe de consigne" value={s.instructionVerb ?? "—"} />
          <div className="col-span-2">
            <dt className="text-xs text-ink-500">Statuts</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              <PedagogicalPill status={s.pedagogicalStatus} />
              <GridPill status={s.gridStatus} />
            </dd>
          </div>
        </dl>
        {s.year < 2027 && s.exerciseType !== "dissertation" && (
          <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-100">
            À partir de la session 2027, l&apos;épreuve composée est notée 3,5 / 5,5 / 9 points (au lieu de 4 / 6 / 10), et 2 points sur 20
            portent sur l&apos;orthographe et la syntaxe. Les attendus de cet exercice restent valables pour s&apos;entraîner.
          </p>
        )}
      </header>

      {/* 3. Énoncé */}
      <section className="mt-10" aria-labelledby="enonce">
        <h2 id="enonce" className="text-lg font-bold">Énoncé</h2>
        {s.subQuestions.length > 0 && (
          <ol className="mt-3 space-y-2">
            {s.subQuestions.map((q) => (
              <li key={q.n} className="rounded-xl bg-white p-3 ring-1 ring-ink-200 dark:bg-ink-900 dark:ring-ink-800">
                <span className="font-semibold">Question {q.n}.</span> {q.text}
                {q.points != null && <span className="ml-1 text-sm text-ink-500">({q.points} pts)</span>}
              </li>
            ))}
          </ol>
        )}
        {s.statementMd ? (
          <div className="reading mt-4" dangerouslySetInnerHTML={{ __html: renderMarkdown(s.statementMd) }} />
        ) : null}
        {s.statementNote && <p className="mt-3 text-sm text-ink-600 dark:text-ink-400">{s.statementNote}</p>}
        {s.siblingParts.length > 0 && (
          <details className="mt-4 rounded-xl bg-ink-100/60 p-4 text-sm dark:bg-ink-900/60">
            <summary className="cursor-pointer font-medium">Contexte : les autres parties de cette épreuve</summary>
            <ul className="mt-2 space-y-1.5 text-ink-700 dark:text-ink-300">
              {s.siblingParts.map((p) => (
                <li key={p.part}>
                  <span className="font-semibold">{p.part}</span> — {p.question}
                  {p.chapter && <span className="text-ink-500"> ({p.chapter})</span>}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {/* 4-5. Corrigé */}
      <section className="mt-10" aria-labelledby="corrige">
        <h2 id="corrige" className="text-lg font-bold">Corrigé détaillé</h2>
        {answer.status === "none" && (
          <Card className="mt-3">
            <p className="font-medium">Corrigé pas encore rédigé.</p>
            <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">
              {s.gridStatus === "correspondance_verifiee"
                ? "Le corrigé officiel (lien ci-dessous) est déjà disponible pour travailler ce sujet."
                : "Aucun corrigé n'est encore publié pour ce sujet."}
            </p>
          </Card>
        )}
        {answer.status === "locked" && (
          <Card className="mt-3 text-center">
            <LockIcon className="mx-auto h-6 w-6 text-brand-600" />
            <p className="mt-2 font-semibold">Corrigé réservé aux comptes Premium</p>
            <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">
              L&apos;énoncé, les sources officielles et le corrigé officiel restent accessibles gratuitement ci-dessous.
            </p>
            <Link href="/premium" className="mt-4 inline-block rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
              Découvrir Premium
            </Link>
          </Card>
        )}
        {answer.status === "ok" && (
          <Reveal label="Afficher le corrigé" hideLabel="Masquer le corrigé">
            <div className="mt-3 rounded-2xl bg-white p-5 ring-1 ring-ink-200 sm:p-7 dark:bg-ink-900 dark:ring-ink-800">
              <div className="mb-5 flex flex-wrap items-center gap-2 text-xs text-ink-500">
                <PedagogicalPill status={answer.answer.validationStatus} />
                <span>Version {answer.answer.version} · révisé le {answer.answer.lastRevisedAt}</span>
                {!answer.answer.validatedByHuman && <Pill tone="warn">Pas encore relu par un enseignant</Pill>}
              </div>
              <div className="reading" data-testid="answer-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(answer.answer.contentMd) }} />
              {answer.answer.limits && (
                <p className="mt-6 rounded-xl bg-ink-100 p-4 text-sm text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                  <span className="font-semibold">Limites signalées : </span>
                  {answer.answer.limits}
                </p>
              )}
            </div>
            {answer.answer.checklist.length > 0 && (
              <details className="mt-4 rounded-2xl bg-white p-5 ring-1 ring-ink-200 dark:bg-ink-900 dark:ring-ink-800">
                <summary className="cursor-pointer font-semibold">Tableau de vérification face au corrigé officiel</summary>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs text-ink-500">
                      <tr>
                        <th className="py-2 pr-3">Élément attendu</th>
                        <th className="py-2 pr-3">Présent</th>
                        <th className="py-2">Où dans le corrigé</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                      {answer.answer.checklist.map((c) => (
                        <tr key={c.criterionId}>
                          <td className="py-2 pr-3">{c.criterion}</td>
                          <td className="py-2 pr-3">{c.present ? "✓" : "✗"}</td>
                          <td className="py-2 text-ink-600 dark:text-ink-400">
                            {c.location}
                            {c.note ? ` — ${c.note}` : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </Reveal>
        )}
      </section>

      {/* 6. Grille / corrigé officiel */}
      <section className="mt-10" aria-labelledby="grille">
        <h2 id="grille" className="text-lg font-bold">Grille et corrigé officiels</h2>
        <Card className="mt-3">
          <div className="flex flex-wrap items-center gap-2">
            <GridPill status={s.grid.matchStatus} />
            {s.grid.reference && <span className="font-mono text-xs text-ink-500">{s.grid.reference}</span>}
          </div>
          <p className="mt-2 text-sm text-ink-700 dark:text-ink-300">{s.grid.matchNotes}</p>
          {s.grid.url && (
            <a href={s.grid.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300">
              Ouvrir le document de correction ↗
            </a>
          )}
          {s.grid.criteria.length > 0 && (
            <>
              <h3 className="mt-5 text-sm font-semibold">Éléments attendus (reformulés d&apos;après le document officiel)</h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                {s.grid.criteria.map((c) => (
                  <li key={c.id} className="flex gap-2">
                    <span className="mt-0.5 shrink-0 rounded bg-ink-100 px-1.5 text-[11px] font-medium uppercase text-ink-600 dark:bg-ink-800 dark:text-ink-300">{c.kind}</span>
                    <span>{c.label}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="mt-4 text-xs text-ink-500">
            Les grilles nationales générales (dissertation, EC3) et la grille de maîtrise de la langue (annexe II, BO 2026) sont
            présentées sur la page <Link href="/methode" className="underline">Méthode</Link>.
          </p>
        </Card>
      </section>

      {/* 7. Notions */}
      {s.notions.length > 0 && (
        <section className="mt-10" aria-labelledby="notions">
          <h2 id="notions" className="text-lg font-bold">Notions mobilisées</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {s.notions.map((n) => (
              <li key={n} className="rounded-full bg-white px-3 py-1 text-sm ring-1 ring-ink-200 dark:bg-ink-900 dark:ring-ink-700">{n}</li>
            ))}
          </ul>
        </section>
      )}

      {/* 10. Sujets proches */}
      {s.related.length > 0 && (
        <section className="mt-10" aria-labelledby="proches">
          <h2 id="proches" className="text-lg font-bold">Sujets proches</h2>
          <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">
            Ces sujets se ressemblent mais restent distincts : chacun a son propre corrigé, adapté à sa consigne.
          </p>
          <ul className="mt-3 space-y-2">
            {s.related.map((r) => (
              <li key={r.id}>
                <Link href={`/sujets/${r.slug}`} className="block rounded-xl bg-white p-4 ring-1 ring-ink-200 hover:ring-brand-300 dark:bg-ink-900 dark:ring-ink-800">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
                    <ExerciseBadge type={r.exerciseType} />
                    <span>{r.year} · {r.center}</span>
                    <Pill tone="info">{SIMILARITY_LABEL[r.similarity]}</Pill>
                  </div>
                  <p className="mt-1.5 font-medium">{r.question}</p>
                  <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">{r.justification}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 8-9. Sources et fiabilité */}
      <section className="mt-10" aria-labelledby="sources">
        <h2 id="sources" className="text-lg font-bold">Sources et fiabilité documentaire</h2>
        <Card className="mt-3">
          <p className="text-sm"><span className="font-semibold">Énoncé : </span>{VERIFICATION_LABEL[s.verificationStatus]}</p>
          {s.verificationNotes && <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">{s.verificationNotes}</p>}
          <ul className="mt-4 space-y-2 text-sm">
            {s.sources.map((src) => (
              <li key={src.url}>
                <a href={src.url} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 hover:underline dark:text-brand-300">
                  {src.label} ↗
                </a>
                <span className="ml-2 text-xs text-ink-500">[{SOURCE_KIND[src.kind]}]</span>
                {src.note && <p className="text-xs text-ink-500">{src.note}</p>}
              </li>
            ))}
          </ul>
          {answer.status === "ok" && answer.answer.sources.length > 0 && (
            <>
              <h3 className="mt-5 text-sm font-semibold">Sources utilisées pour le corrigé</h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                {answer.answer.sources.map((src) => (
                  <li key={src.url}>
                    <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline dark:text-brand-300">{src.label} ↗</a>
                    {src.note && <span className="text-xs text-ink-500"> — {src.note}</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
          {s.externalCorrections.length > 0 && (
            <>
              <h3 className="mt-5 text-sm font-semibold">Autres corrigés repérés (non reproduits)</h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                {s.externalCorrections.map((e) => (
                  <li key={e.url}>
                    <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline dark:text-brand-300">{e.author ?? e.url} ↗</a>
                    <span className="text-xs text-ink-500"> — {e.note}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </section>
    </article>
  );
}

const SOURCE_KIND: Record<string, string> = {
  officiel: "site officiel",
  archive: "copie d'archive (Wayback Machine)",
  "tiers-relai-officiel": "document officiel relayé par un site tiers",
  tiers: "site tiers",
};

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-ink-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink-900 dark:text-ink-100">{value}</dd>
    </div>
  );
}
