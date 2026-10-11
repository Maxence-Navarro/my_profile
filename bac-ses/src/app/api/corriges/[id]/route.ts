// API des corrigés : même contrôle d'accès serveur que les pages (utile pour une future appli mobile, et pour les tests).
import { getAnswerForViewer } from "@/lib/access";
import { getSubjectSummaries } from "@/lib/data";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const subject = getSubjectSummaries().find((s) => s.id === id || s.slug === id);
  if (!subject) return Response.json({ error: "sujet inconnu" }, { status: 404 });
  const result = getAnswerForViewer(subject, await getViewer());
  if (result.status === "locked") return Response.json({ error: "premium requis" }, { status: 403 });
  if (result.status === "none") return Response.json({ error: "corrigé non disponible" }, { status: 404 });
  return Response.json(result.answer, { headers: { "Cache-Control": "private, no-store" } });
}
