import type { ExerciseType, SubjectSummary } from "./types";

export interface SubjectFilters {
  type: ExerciseType | "all";
  year: number | "all";
  query: string;
  onlyWithAnswer: boolean;
}

export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, " ")
    .toLowerCase();
}

/** Filtre pur (testé unitairement) : type, année, texte (tous les mots), présence d'un corrigé. */
export function filterSubjects(subjects: SubjectSummary[], f: SubjectFilters): SubjectSummary[] {
  const words = normalize(f.query).split(/\s+/).filter(Boolean);
  return subjects
    .filter((s) => f.type === "all" || s.exerciseType === f.type)
    .filter((s) => f.year === "all" || s.year === f.year)
    .filter((s) => !f.onlyWithAnswer || s.hasAnswer)
    .filter((s) => {
      if (!words.length) return true;
      const hay = normalize(
        [s.question, ...s.subQuestions.map((q) => q.text), s.center, String(s.year), s.examCode, s.exerciseType, ...s.notions].join(" "),
      );
      return words.every((w) => hay.includes(w));
    })
    .sort((a, b) => b.year - a.year || a.examCode.localeCompare(b.examCode) || a.exerciseType.localeCompare(b.exerciseType));
}
