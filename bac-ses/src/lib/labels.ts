import type { ExerciseType, GridMatchStatus, PedagogicalStatus, ProgramField, SimilarityType, VerificationStatus } from "./types";

export const EXERCISE_LABEL: Record<ExerciseType, { short: string; long: string; hint: string }> = {
  EC1: { short: "EC1", long: "Mobilisation des connaissances", hint: "Question de cours, réponse courte et argumentée" },
  EC2: { short: "EC2", long: "Étude d'un document", hint: "Lecture des données + mobilisation des connaissances" },
  EC3: { short: "EC3", long: "Raisonnement sur dossier documentaire", hint: "Raisonnement structuré à partir de 2-3 documents" },
  dissertation: { short: "Dissertation", long: "Dissertation sur dossier documentaire", hint: "Problématique, plan argumenté, introduction et conclusion" },
};

export const EXERCISE_ORDER: ExerciseType[] = ["EC1", "EC2", "EC3", "dissertation"];

export const EXERCISE_STYLE: Record<ExerciseType, string> = {
  EC1: "bg-ec1-soft text-ec1 ring-ec1/30",
  EC2: "bg-ec2-soft text-ec2 ring-ec2/30",
  EC3: "bg-ec3-soft text-ec3 ring-ec3/30",
  dissertation: "bg-diss-soft text-diss ring-diss/30",
};

export const FIELD_LABEL: Record<ProgramField, string> = {
  "science-economique": "Science économique",
  "sociologie-science-politique": "Sociologie et science politique",
  "regards-croises": "Regards croisés",
};

export const PEDAGOGICAL_LABEL: Record<PedagogicalStatus, { label: string; tone: "neutral" | "info" | "warn" | "ok" | "strong" }> = {
  a_rechercher: { label: "Corrigé à rechercher", tone: "neutral" },
  sources_trouvees: { label: "Sources trouvées", tone: "info" },
  en_redaction: { label: "Corrigé en cours de rédaction", tone: "info" },
  a_verifier_grille: { label: "À vérifier avec la grille", tone: "warn" },
  verifie_pedagogiquement: { label: "Vérifié (contrôle automatique)", tone: "ok" },
  valide_relecture_humaine: { label: "Validé par un enseignant", tone: "strong" },
};

export const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  a_verifier: "Énoncé à vérifier",
  verifie_source_officielle: "Énoncé vérifié sur source officielle",
  verifie_source_tierce: "Énoncé vérifié sur un relais du document officiel",
  incoherence_signalee: "Incohérence signalée entre sources",
};

export const GRID_LABEL: Record<GridMatchStatus, { label: string; tone: "ok" | "warn" | "neutral" }> = {
  correspondance_verifiee: { label: "Corrigé officiel retrouvé", tone: "ok" },
  correspondance_non_verifiee: { label: "Correspondance non vérifiée", tone: "warn" },
  grille_non_retrouvee: { label: "Grille officielle non retrouvée", tone: "neutral" },
};

export const SIMILARITY_LABEL: Record<SimilarityType, string> = {
  identique: "Sujets identiques",
  tres_proche_adaptation: "Très proches : réponse à adapter",
  meme_theme_corriges_distincts: "Même thème : corrigés distincts",
  incertain: "Relation incertaine",
};
