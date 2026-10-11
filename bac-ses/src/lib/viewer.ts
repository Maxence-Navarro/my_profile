import { cookies } from "next/headers";
import { parseSessionToken, SESSION_COOKIE, type Viewer } from "./access";

/** Lit le visiteur courant à partir du cookie signé (côté serveur uniquement). */
export async function getViewer(): Promise<Viewer> {
  const jar = await cookies();
  return parseSessionToken(jar.get(SESSION_COOKIE)?.value);
}
