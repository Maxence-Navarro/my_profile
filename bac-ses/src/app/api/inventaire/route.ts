import { getPublishedFile } from "@/lib/data";

export function GET(req: Request) {
  const format = new URL(req.url).searchParams.get("format") === "csv" ? "csv" : "json";
  const body = getPublishedFile(format === "csv" ? "inventory.csv" : "inventory.json");
  if (!body) return new Response("Inventaire non généré (lancer npm run data:build)", { status: 404 });
  return new Response(body, {
    headers: {
      "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="inventaire-croissance.${format}"`,
    },
  });
}
