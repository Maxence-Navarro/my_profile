import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Card, SectionTitle } from "@/components/ui";
import { accessMode, createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_S } from "@/lib/access";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Premium" };
export const dynamic = "force-dynamic";

async function activateDemo() {
  "use server";
  if (accessMode() !== "demo") redirect("/premium?erreur=demo-desactive");
  const jar = await cookies();
  jar.set(SESSION_COOKIE, createSessionToken({ tier: "premium", source: "demo" }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_S,
  });
  redirect("/premium?ok=1");
}

async function signOut() {
  "use server";
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/premium");
}

export default async function PremiumPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const viewer = await getViewer();
  const sp = await searchParams;
  const demo = accessMode() === "demo";
  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
      <SectionTitle eyebrow="Accès" title="Premium">
        Premium donne accès à l&apos;ensemble des corrigés détaillés et à leurs tableaux de vérification. Les énoncés, les liens
        vers les documents officiels et les corrigés officiels restent gratuits.
      </SectionTitle>

      <Card className="mt-8">
        <p className="text-sm text-ink-500">Votre accès actuel</p>
        <p className="mt-1 text-xl font-bold" data-testid="tier">
          {viewer.tier === "premium" ? `Premium (${viewer.source === "demo" ? "démonstration" : viewer.source})` : "Gratuit"}
        </p>
        {sp.ok && <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">Accès de démonstration activé pour 30 jours sur ce navigateur.</p>}
        {sp.erreur && <p className="mt-2 text-sm text-red-700">Le mode démonstration est désactivé sur ce serveur.</p>}
        <div className="mt-5 flex flex-wrap gap-3">
          {viewer.tier !== "premium" && demo && (
            <form action={activateDemo}>
              <button className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700" data-testid="activate-demo">
                Activer l&apos;accès de démonstration
              </button>
            </form>
          )}
          {viewer.tier === "premium" && (
            <form action={signOut}>
              <button className="rounded-xl bg-ink-100 px-4 py-2.5 text-sm font-semibold hover:bg-ink-200 dark:bg-ink-800 dark:hover:bg-ink-700">Revenir à l&apos;accès gratuit</button>
            </form>
          )}
        </div>
      </Card>

      <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-100">
        <p className="font-semibold">Version de démonstration — aucun paiement n&apos;est activé.</p>
        <p className="mt-1">
          Le bouton ci-dessus simule un abonnement : il crée un cookie de session signé côté serveur. Le paiement en ligne
          (Stripe) n&apos;est ni configuré ni testé dans cette version.
        </p>
      </div>
    </div>
  );
}
