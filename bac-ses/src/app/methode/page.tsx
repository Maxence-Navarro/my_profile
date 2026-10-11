import type { Metadata } from "next";
import Link from "next/link";
import { Card, ExerciseBadge, SectionTitle } from "@/components/ui";
import { EXERCISE_LABEL } from "@/lib/labels";

export const metadata: Metadata = { title: "Méthode : les 4 exercices et le barème" };

const BO = "https://www.education.gouv.fr/bo/2026/Special4/MENE2622656N";

export default function MethodPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
      <SectionTitle eyebrow="Méthode" title="Les quatre exercices de l'épreuve écrite">
        Le candidat choisit entre une dissertation et une épreuve composée en trois parties. Chaque format a ses attentes
        propres : un bon corrigé d&apos;EC1 n&apos;est pas une mini-dissertation.
      </SectionTitle>

      <Card className="mt-8 border-l-4 border-amber-500">
        <h2 className="font-semibold">Ce qui change à partir de la session 2027</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-700 dark:text-ink-300">
          <li>Épreuve composée : EC1 noté sur <strong>3,5 points</strong>, EC2 sur <strong>5,5 points</strong>, EC3 sur <strong>9 points</strong> (au lieu de 4 / 6 / 10).</li>
          <li><strong>2 points sur 20</strong> sont dédiés à la maîtrise des normes orthographiques et syntaxiques, à la dissertation comme à l&apos;épreuve composée.</li>
          <li>Les 9 questions évaluables à l&apos;écrit sont listées en annexe I ; une grille des « attendus et observables rédactionnels » figure en annexe II.</li>
        </ul>
        <p className="mt-3 text-xs text-ink-500">
          Source : note de service du 11 septembre 2026, BO spécial n° 4 du 17 septembre 2026 (NOR MENE2622656N) —{" "}
          <a className="underline" href={BO} target="_blank" rel="noopener noreferrer">texte officiel</a>. Les sujets 2021–2026 de la plateforme ont été passés avec l&apos;ancien barème (4 / 6 / 10).
        </p>
      </Card>

      <div className="mt-8 space-y-4">
        <Card>
          <div className="flex items-center gap-2"><ExerciseBadge type="EC1" size="md" /><h2 className="font-semibold">{EXERCISE_LABEL.EC1.long}</h2></div>
          <p className="mt-2 text-sm text-ink-700 dark:text-ink-300">Une question, sans document. On attend une réponse directe, des définitions précises et un mécanisme expliqué étape par étape ; un exemple quand la consigne le demande. Pas d&apos;introduction ni de conclusion développées.</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2"><ExerciseBadge type="EC2" size="md" /><h2 className="font-semibold">{EXERCISE_LABEL.EC2.long}</h2></div>
          <p className="mt-2 text-sm text-ink-700 dark:text-ink-300">Un document statistique, deux questions. Question 1 : lecture et traitement rigoureux des données (unités, dates, calculs). Question 2 : mobiliser le cours pour expliquer, en s&apos;appuyant sur les données. On sépare clairement ce que dit le document et ce qu&apos;apporte le cours.</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2"><ExerciseBadge type="EC3" size="md" /><h2 className="font-semibold">{EXERCISE_LABEL.EC3.long}</h2></div>
          <p className="mt-2 text-sm text-ink-700 dark:text-ink-300">Un raisonnement ciblé à partir de 2 ou 3 documents : introduction (définitions, annonce), paragraphes argumentés (idée, explication, illustration par les documents), conclusion. Pas de problématique en deux parties opposées si la consigne ne le demande pas.</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2"><ExerciseBadge type="dissertation" size="md" /><h2 className="font-semibold">{EXERCISE_LABEL.dissertation.long}</h2></div>
          <p className="mt-2 text-sm text-ink-700 dark:text-ink-300">Analyse des termes, problématique, plan argumenté et équilibré, introduction et conclusion. Le dossier (3-4 documents factuels) appuie l&apos;argumentation sans la remplacer.</p>
        </Card>
      </div>

      <p className="mt-8 text-sm text-ink-600 dark:text-ink-400">
        Les grilles nationales de correction de la dissertation et de l&apos;EC3 étaient publiées sur le site SES de l&apos;académie
        de Versailles (rubrique « Grille d&apos;évaluation Baccalauréat ») ; ces fichiers n&apos;ont pas pu être récupérés lors de la
        collecte (site injoignable, pas de copie d&apos;archive). Voir <Link href="/sources" className="underline">Sources et limites</Link>.
      </p>
    </div>
  );
}
