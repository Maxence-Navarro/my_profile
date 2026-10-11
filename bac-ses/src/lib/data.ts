// Couche d'accès aux données (serveur uniquement).
// V1 : lit les fichiers JSON publiés par le pipeline (data/published).
// Une implémentation PostgreSQL peut remplacer ce module sans toucher aux pages
// (voir db/schema.sql et scripts/import-to-postgres.ts).
import fs from "node:fs";
import path from "node:path";
import type { Answer, Chapter, SubjectDetail, SubjectSummary } from "./types";

const DIR = path.join(process.cwd(), "data", "published");

const cache = new Map<string, unknown>();

function readJson<T>(rel: string): T | null {
  const file = path.join(DIR, rel);
  if (process.env.NODE_ENV === "production" && cache.has(file)) return cache.get(file) as T;
  if (!fs.existsSync(file)) return null;
  const value = JSON.parse(fs.readFileSync(file, "utf8")) as T;
  cache.set(file, value);
  return value;
}

const SAFE_ID = /^[A-Za-z0-9-]+$/;

export function getChapters(): Chapter[] {
  return readJson<Chapter[]>("chapters.json") ?? [];
}

export function getChapter(id: string): Chapter | null {
  return getChapters().find((c) => c.id === id) ?? null;
}

export function getSubjectSummaries(chapterId?: string): SubjectSummary[] {
  const all = readJson<SubjectSummary[]>("subjects.json") ?? [];
  return chapterId ? all.filter((s) => s.chapterId === chapterId) : all;
}

export function getSubject(slug: string): SubjectDetail | null {
  if (!SAFE_ID.test(slug)) return null;
  return readJson<SubjectDetail>(path.join("subjects", `${slug}.json`));
}

/** Lecture brute d'un corrigé : à n'appeler qu'après contrôle d'accès (voir access.ts). */
export function readAnswerUnchecked(subjectId: string): Answer | null {
  if (!SAFE_ID.test(subjectId)) return null;
  return readJson<Answer>(path.join("answers", `${subjectId}.json`));
}

export interface Meta {
  generatedAt: string;
  inventory: {
    totalQuestions: number;
    byType: Record<string, number>;
    withAnswer: number;
    withOfficialGrid: number;
    toVerify: number;
  };
}

export function getMeta(): Meta | null {
  return readJson<Meta>("meta.json");
}

export function getPublishedFile(name: string): string | null {
  if (!/^[a-z0-9_.-]+$/i.test(name)) return null;
  const file = path.join(DIR, name);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
}
