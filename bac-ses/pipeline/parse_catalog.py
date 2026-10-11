"""Étape 1 — Parse le catalogue « Sujets du Baccalauréat » (rubrique 18) de ses.ac-versailles.fr.

Le catalogue liste un document par question (tuile) avec des badges :
type d'exercice, chapitre, lieu, format, année, session.

Usage : python3 -I pipeline/parse_catalog.py [--snapshot 20260414092412]
Sortie : data/raw/catalog_rubrique18.json (toutes les questions, tous chapitres)

Idempotent : la clé de chaque entrée est l'identifiant SPIP du document (« arg »),
stable côté site officiel. Relancer le script réécrit le même fichier sans doublon.
"""
from __future__ import annotations

import argparse
import html
import re
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlparse, unquote

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import RAW, OFFICIAL_HOST, fetch, norm_text, write_json  # noqa: E402

RUBRIQUE_URL = OFFICIAL_HOST + "spip.php?rubrique18"

TYPES = {
    "Écrit - Dissertation": "dissertation",
    "Écrit - EC1 - Connaissances": "EC1",
    "Écrit - EC2 - Étude de document": "EC2",
    "Écrit - EC3 - Raisonnement sur dossier documentaire": "EC3",
    "Oral - Connaissances": "oral-connaissances",
    "Oral - Question sur document": "oral-document",
    "Oral - Question principale": "oral-principale",
}
FORMATS = {"PDF", "Word"}
SESSIONS = {"Normale", "Remplacement"}
LIEUX = {
    "France métropolitaine", "Nouvelle-Calédonie", "Polynésie", "Amérique du Nord",
    "Amérique du Sud", "Asie", "Liban", "Autres centres étrangers", "La Réunion",
}
YEAR_RE = re.compile(r"^20\d\d$")

TILE_RE = re.compile(
    r'<a class="fr-tile__link[^"]*" href="(?P<href>[^"]+)">(?P<title>.*?)</a>.*?'
    r'<div class="fr-tile__start">(?P<badges>.*?)</div>.*?'
    r'<p class="fr-tile__desc[^"]*">(?P<desc>.*?)</p>',
    re.S,
)
BADGE_RE = re.compile(r'<p class="fr-badge[^"]*">(.*?)</p>', re.S)


def clean(fragment: str) -> str:
    return norm_text(html.unescape(re.sub(r"<[^>]+>", "", fragment)))


def official_from_href(href: str) -> str:
    href = html.unescape(href)
    if "web.archive.org" in href:
        href = href[href.index("/https://") + 1 :] if "/https://" in href else href
    return href


def parse(html_text: str) -> list[dict]:
    entries = []
    for m in TILE_RE.finditer(html_text):
        url = official_from_href(m.group("href"))
        q = parse_qs(urlparse(url).query)
        arg = q.get("arg", [""])[0]
        file_param = unquote(q.get("file", [""])[0])
        badges = [clean(b) for b in BADGE_RE.findall(m.group("badges"))]
        entry = {
            "spip_doc_id": int(arg) if arg.isdigit() else None,
            "title": clean(m.group("title")),
            "official_url": url,
            "file_name": file_param.split("/")[-1] or None,
            "exercise_type": None,
            "exercise_type_label": None,
            "chapter_label": None,
            "lieu": None,
            "format": None,
            "year": None,
            "session": None,
            "file_info": clean(m.group("desc")),
            "unclassified_badges": [],
        }
        for b in badges:
            if b in TYPES:
                entry["exercise_type"], entry["exercise_type_label"] = TYPES[b], b
            elif b in FORMATS:
                entry["format"] = b
            elif b in SESSIONS:
                entry["session"] = b
            elif b in LIEUX:
                entry["lieu"] = b
            elif YEAR_RE.match(b):
                entry["year"] = int(b)
            elif b.endswith("?"):
                entry["chapter_label"] = b
            else:
                entry["unclassified_badges"].append(b)
        entries.append(entry)
    return entries


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--snapshot", default="20260414092412", help="horodatage Wayback de repli")
    ap.add_argument("--html", help="parser un fichier HTML local au lieu de télécharger")
    args = ap.parse_args()

    if args.html:
        text = Path(args.html).read_text(encoding="utf-8", errors="replace")
        provenance = {"via": "fichier-local", "fetched_url": args.html}
    else:
        meta = fetch(RUBRIQUE_URL, timestamp=args.snapshot)
        if meta["status"] != 200:
            sys.exit(f"Rubrique inaccessible (officiel et archive) : {meta['attempts']}")
        text = Path(meta["path"]).read_text(encoding="utf-8", errors="replace")
        provenance = {k: meta.get(k) for k in ("via", "fetched_url", "fetched_at", "attempts")}

    entries = parse(text)
    declared = re.search(r"(\d+)\s+documents", text)
    ids = [e["spip_doc_id"] for e in entries]
    dupes = sorted({i for i in ids if ids.count(i) > 1})
    out = {
        "source_page": RUBRIQUE_URL,
        "provenance": provenance,
        "declared_count": int(declared.group(1)) if declared else None,
        "parsed_count": len(entries),
        "duplicate_doc_ids": dupes,
        "entries": sorted(entries, key=lambda e: e["spip_doc_id"] or 0),
    }
    write_json(RAW / "catalog_rubrique18.json", out)
    print(f"{len(entries)} entrées parsées (déclarées : {out['declared_count']}), doublons d'id : {dupes}")


if __name__ == "__main__":
    main()
