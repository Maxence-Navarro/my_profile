import type { Metadata } from "next";
import { Card, SectionTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Sources et limites" };

const SOURCES = [
  {
    name: "Académie de Versailles — rubrique « Sujets du Baccalauréat »",
    url: "https://ses.ac-versailles.fr/spip.php?rubrique18",
    role: "Catalogue officiel de 395 documents classés par type d'exercice, chapitre, lieu, année et session. Point de départ de l'inventaire.",
    access: "Site injoignable depuis l'environnement de collecte (connexion coupée, HTTP 503). Exploré via la copie de la Wayback Machine du 14/04/2026 : la session de juin 2026 n'y figure donc pas.",
  },
  {
    name: "sujetdebac.fr — annales de spécialité SES 2021-2026",
    url: "https://www.sujetdebac.fr/annales/specialites/spe-sciences-eco-sociales/",
    role: "Sujets nationaux complets (96 sessions) et documents de correction officiels transmis aux correcteurs (36 sessions, 2021-2024), identifiés par leur code (ex. 22-SESJ1ME1C).",
    access: "Site non institutionnel qui relaie des documents officiels : provenance conservée et signalée sur chaque fiche.",
  },
  {
    name: "Bulletin officiel spécial n° 4 du 17 septembre 2026",
    url: "https://www.education.gouv.fr/bo/2026/Special4/MENE2622656N",
    role: "Définition de l'épreuve à partir de la session 2027 : questions évaluables (annexe I), barème 3,5 / 5,5 / 9, 2 points de maîtrise de la langue (annexe II).",
    access: "Texte lu dans le PDF officiel du BO.",
  },
];

const LIMITS = [
  "Aucun document de correction officiel n'a été retrouvé pour les sessions 2025 et 2026 : les sujets concernés sont marqués « grille officielle non retrouvée ».",
  "Les grilles nationales génériques (dissertation, EC3) publiées par l'académie de Versailles n'ont pas pu être téléchargées (site injoignable, aucune copie d'archive).",
  "Le sujet de 2024 Amérique du Sud, jour 1, n'a pas pu être récupéré (archive injoignable au moment de la collecte).",
  "Le sujet 2023 Amérique du Sud, jour 1, est un PDF scanné : son libellé a été lu dans le corrigé officiel et reste à vérifier sur le sujet.",
  "Un document daté « 2020 » sur le site de Versailles (droits de propriété) n'a pas pu être identifié avec certitude : il n'est pas publié.",
  "Les dossiers documentaires des sujets ne sont pas reproduits (droits des auteurs des documents) : chaque fiche renvoie au sujet officiel.",
  "Les corrigés de la plateforme sont contrôlés point par point face au corrigé officiel lorsqu'il existe, mais aucun n'a encore été relu par un enseignant.",
];

export default function SourcesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
      <SectionTitle eyebrow="Traçabilité" title="Sources et limites">
        D&apos;où viennent les sujets, les corrigés officiels et les informations sur l&apos;épreuve — et ce qui n&apos;a pas pu être vérifié.
      </SectionTitle>
      <div className="mt-8 space-y-4">
        {SOURCES.map((s) => (
          <Card key={s.url}>
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 hover:underline dark:text-brand-300">{s.name} ↗</a>
            <p className="mt-2 text-sm">{s.role}</p>
            <p className="mt-1 text-sm text-ink-500">{s.access}</p>
          </Card>
        ))}
      </div>
      <h2 className="mt-12 text-xl font-bold">Limites connues</h2>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-ink-700 dark:text-ink-300">
        {LIMITS.map((l) => <li key={l}>{l}</li>)}
      </ul>
      <h2 className="mt-12 text-xl font-bold">Comment les corrigés sont produits</h2>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-ink-700 dark:text-ink-300">
        <li>Lecture du sujet officiel (consigne exacte, documents, barème).</li>
        <li>Lecture du document de correction officiel de la session, quand il existe : extraction des éléments attendus.</li>
        <li>Comparaison avec des corrigés publiés ailleurs (enseignants, académies, éditeurs), référencés mais jamais recopiés.</li>
        <li>Rédaction d&apos;un corrigé original, au format de l&apos;exercice, à partir des objectifs d&apos;apprentissage du programme.</li>
        <li>Tableau de vérification : chaque élément attendu est-il présent, et où ? Puis relecture critique.</li>
        <li>Statut affiché : « vérifié (contrôle automatique) » tant qu&apos;aucun enseignant ne l&apos;a validé.</li>
      </ol>
    </div>
  );
}
