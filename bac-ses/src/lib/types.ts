// Types des données publiées (data/published/*.json), générées par pipeline/build.py.

export type ExerciseType = "EC1" | "EC2" | "EC3" | "dissertation";
export type ProgramField = "science-economique" | "sociologie-science-politique" | "regards-croises";
export type ChapterStatus = "published" | "coming_soon";

export type VerificationStatus =
  | "a_verifier"
  | "verifie_source_officielle"
  | "verifie_source_tierce"
  | "incoherence_signalee";

export type PedagogicalStatus =
  | "a_rechercher"
  | "sources_trouvees"
  | "en_redaction"
  | "a_verifier_grille"
  | "verifie_pedagogiquement"
  | "valide_relecture_humaine";

export type GridMatchStatus = "correspondance_verifiee" | "correspondance_non_verifiee" | "grille_non_retrouvee";
export type SimilarityType = "identique" | "tres_proche_adaptation" | "meme_theme_corriges_distincts" | "incertain";
export type AccessTier = "free" | "premium";

export interface Chapter {
  id: string;
  number: number;
  title: string;
  shortTitle: string;
  field: ProgramField;
  status: ChapterStatus;
  summary?: string;
  subjectCount: number;
}

export interface SourceLink {
  label: string;
  url: string;
  kind: "officiel" | "archive" | "tiers-relai-officiel" | "tiers";
  note?: string;
}

export interface SubQuestion {
  n: number;
  text: string;
  points?: number;
}

export interface SiblingPart {
  part: string;
  question: string;
  chapter?: string;
}

/** Données publiques d'un sujet : jamais de contenu premium ici. */
export interface SubjectSummary {
  id: string;
  slug: string;
  chapterId: string;
  exerciseType: ExerciseType;
  variant: string | null;
  examCode: string;
  year: number;
  session: string;
  day: string | null;
  center: string;
  question: string;
  subQuestions: SubQuestion[];
  points: number | null;
  instructionVerb: string | null;
  notions: string[];
  accessTier: AccessTier;
  verificationStatus: VerificationStatus;
  pedagogicalStatus: PedagogicalStatus;
  hasAnswer: boolean;
  gridStatus: GridMatchStatus;
}

export interface GridCriterion {
  id: string;
  label: string;
  kind: "connaissance" | "mecanisme" | "document" | "methode" | "exemple";
  points?: number;
}

export interface EvaluationGrid {
  isOfficial: boolean;
  reference: string | null;
  url: string | null;
  matchStatus: GridMatchStatus;
  matchNotes: string;
  /** Éléments attendus extraits/reformulés depuis le document officiel. */
  criteria: GridCriterion[];
}

export interface RelatedSubject {
  id: string;
  slug: string;
  question: string;
  exerciseType: ExerciseType;
  year: number;
  center: string;
  similarity: SimilarityType;
  justification: string;
  answerReuse: string;
}

export interface SubjectDetail extends SubjectSummary {
  statementMd: string | null;
  statementNote: string | null;
  siblingParts: SiblingPart[];
  sources: SourceLink[];
  verificationNotes: string | null;
  grid: EvaluationGrid;
  related: RelatedSubject[];
  externalCorrections: {
    url: string;
    author: string | null;
    note: string;
  }[];
}

export interface ChecklistItem {
  criterionId: string;
  criterion: string;
  present: boolean;
  location: string;
  note?: string;
}

/** Corrigé : contenu potentiellement premium, servi uniquement après contrôle serveur. */
export interface Answer {
  subjectId: string;
  version: number;
  contentMd: string;
  checklist: ChecklistItem[];
  sources: SourceLink[];
  validationStatus: PedagogicalStatus;
  validatedByHuman: boolean;
  lastRevisedAt: string;
  limits: string | null;
}
