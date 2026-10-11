import type { Metadata } from "next";
import Link from "next/link";
import { SectionTitle } from "@/components/ui";
import { getMeta, getSubjectSummaries } from "@/lib/data";
import { GRID_LABEL, PEDAGOGICAL_LABEL } from "@/lib/labels";

export const metadata: Metadata = { title: "Inventaire des sujets" };

export default function InventoryPage() {
  const subjects = getSubjectSummaries("croissance").sort((a, b) => a.year - b.year || a.examCode.localeCompare(b.examCode));
  const meta = getMeta();
  const inv = meta?.inventory;
  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
      <SectionTitle eyebrow="Transparence" title="Inventaire — Croissance économique">
        Toutes les questions d&apos;examen recensées pour ce chapitre, avec leurs statuts. Exportable pour vérification.
      </SectionTitle>
      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <a className="rounded-lg bg-white px-3 py-2 font-medium ring-1 ring-ink-200 hover:bg-ink-50 dark:bg-ink-900 dark:ring-ink-700" href="/api/inventaire?format=csv">Télécharger CSV</a>
        <a className="rounded-lg bg-white px-3 py-2 font-medium ring-1 ring-ink-200 hover:bg-ink-50 dark:bg-ink-900 dark:ring-ink-700" href="/api/inventaire?format=json">Télécharger JSON</a>
      </div>
      {inv && (
        <p className="mt-4 text-sm text-ink-600 dark:text-ink-400">
          {inv.totalQuestions} questions distinctes · EC1 {inv.byType.EC1} · EC2 {inv.byType.EC2} · EC3 {inv.byType.EC3} · dissertations {inv.byType.dissertation} ·{" "}
          {inv.withOfficialGrid} corrigés officiels vérifiés · {inv.withAnswer} corrigés rédigés · {inv.toVerify} énoncé(s) à vérifier.
        </p>
      )}
      <div className="mt-4 overflow-x-auto rounded-2xl bg-white ring-1 ring-ink-200 dark:bg-ink-900 dark:ring-ink-800">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-ink-50 text-xs uppercase text-ink-500 dark:bg-ink-800/50">
            <tr>
              <th className="px-3 py-2">Identifiant</th>
              <th className="px-3 py-2">Année · centre</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Question</th>
              <th className="px-3 py-2">Grille</th>
              <th className="px-3 py-2">Corrigé</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
            {subjects.map((s) => (
              <tr key={s.id}>
                <td className="px-3 py-2 font-mono text-xs"><Link href={`/sujets/${s.slug}`} className="text-brand-700 hover:underline dark:text-brand-300">{s.id}</Link></td>
                <td className="px-3 py-2 whitespace-nowrap">{s.year} · {s.center}{s.session !== "normale" ? ` (${s.session})` : ""}</td>
                <td className="px-3 py-2">{s.exerciseType}</td>
                <td className="px-3 py-2">{s.question}</td>
                <td className="px-3 py-2 text-xs">{GRID_LABEL[s.gridStatus].label}</td>
                <td className="px-3 py-2 text-xs">{PEDAGOGICAL_LABEL[s.pedagogicalStatus].label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {meta && (
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <section>
            <h2 className="font-semibold">À vérifier</h2>
            <ul className="mt-2 space-y-2 text-sm text-ink-700 dark:text-ink-300">
              {(meta as unknown as { toVerify: { id: string; question: string; note: string }[] }).toVerify.map((t) => (
                <li key={t.id}><span className="font-mono text-xs">{t.id}</span> — « {t.question} » — {t.note}</li>
              ))}
            </ul>
            <h2 className="mt-6 font-semibold">Hors périmètre</h2>
            <ul className="mt-2 space-y-2 text-sm text-ink-700 dark:text-ink-300">
              {(meta as unknown as { outOfScope: { note: string }[] }).outOfScope.map((t) => <li key={t.note}>{t.note}</li>)}
            </ul>
          </section>
          <section>
            <h2 className="font-semibold">Candidats écartés (autre chapitre)</h2>
            <ul className="mt-2 max-h-96 space-y-1.5 overflow-y-auto text-sm text-ink-700 dark:text-ink-300">
              {(meta as unknown as { excludedCandidates: { id: string; reason: string }[] }).excludedCandidates.map((t) => (
                <li key={t.id}><span className="font-mono text-xs">{t.id}</span> — {t.reason}</li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
