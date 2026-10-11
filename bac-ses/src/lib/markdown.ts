import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: false });

/**
 * Rendu Markdown des contenus éditoriaux (énoncés transcrits, corrigés).
 * Ces contenus sont rédigés par l'équipe et versionnés dans le dépôt (pas de saisie utilisateur) ;
 * on neutralise malgré tout le HTML brut et les liens javascript: par précaution.
 */
export function renderMarkdown(md: string): string {
  const escaped = md.replace(/<(?!\/?(sup|sub|br)\b)/gi, "&lt;");
  const html = marked.parse(escaped, { async: false }) as string;
  return html.replace(/href="javascript:[^"]*"/gi, 'href="#"');
}
