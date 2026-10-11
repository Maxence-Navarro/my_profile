// Droits d'accès — vérifiés côté serveur, indépendants du paiement.
//
// V1 : aucun paiement réel. En ACCESS_MODE=demo, un visiteur peut activer un accès
// premium de démonstration ; le droit est stocké dans un cookie httpOnly signé (HMAC),
// impossible à fabriquer côté client sans SESSION_SECRET.
// Le futur webhook Stripe n'aura qu'à créer un « entitlement » (voir db/schema.sql)
// et émettre le même type de session : les pages n'ont pas à changer.
import crypto from "node:crypto";
import { readAnswerUnchecked } from "./data";
import type { Answer, SubjectSummary } from "./types";

export const SESSION_COOKIE = "bses_session";
const MAX_AGE_S = 60 * 60 * 24 * 30;

export type Tier = "free" | "premium";
export interface Viewer {
  tier: Tier;
  source: "anonymous" | "demo" | "stripe";
}
export const ANONYMOUS: Viewer = { tier: "free", source: "anonymous" };

export function accessMode(): "demo" | "off" {
  return process.env.ACCESS_MODE === "off" ? "off" : "demo";
}

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") {
    // En production sans secret, on refuse toute session (tout reste verrouillé).
    return "";
  }
  return "dev-only-insecure-secret-change-me";
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(viewer: Viewer, now = Date.now()): string {
  const payload = Buffer.from(
    JSON.stringify({ t: viewer.tier, s: viewer.source, exp: Math.floor(now / 1000) + MAX_AGE_S }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function parseSessionToken(token: string | undefined | null, now = Date.now()): Viewer {
  if (!token || !secret()) return ANONYMOUS;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return ANONYMOUS;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return ANONYMOUS;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof data.exp !== "number" || data.exp * 1000 < now) return ANONYMOUS;
    if (data.s === "demo" && accessMode() !== "demo") return ANONYMOUS;
    if (data.t === "premium" && (data.s === "demo" || data.s === "stripe")) return { tier: "premium", source: data.s };
  } catch {
    return ANONYMOUS;
  }
  return ANONYMOUS;
}

export const SESSION_MAX_AGE_S = MAX_AGE_S;

export function canReadAnswer(subject: Pick<SubjectSummary, "accessTier">, viewer: Viewer): boolean {
  return subject.accessTier === "free" || viewer.tier === "premium";
}

export type AnswerResult =
  | { status: "ok"; answer: Answer }
  | { status: "locked" }
  | { status: "none" };

/** Seul point d'entrée pour obtenir un corrigé : le contrôle d'accès est fait ici, côté serveur. */
export function getAnswerForViewer(subject: Pick<SubjectSummary, "id" | "accessTier" | "hasAnswer">, viewer: Viewer): AnswerResult {
  if (!subject.hasAnswer) return { status: "none" };
  if (!canReadAnswer(subject, viewer)) return { status: "locked" };
  const answer = readAnswerUnchecked(subject.id);
  return answer ? { status: "ok", answer } : { status: "none" };
}
