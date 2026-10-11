"""Étape 2 — Télécharge les documents du catalogue et en extrait le texte.

Usage : python3 -I pipeline/download_docs.py [--chapter croissance] [--all]

- DOCX -> Markdown via pandoc (les tableaux sont conservés, les images extraites dans media/)
- PDF  -> texte via pdftotext -layout
Sorties : data/raw/documents/<spip_doc_id>/{text.md|text.txt, media/}, et
          data/raw/documents_index.json (provenance, statut d'accessibilité).
Idempotent : les téléchargements sont mis en cache (data/raw/cache), l'index est réécrit.
"""
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import RAW, fetch, read_json, write_json  # noqa: E402

DOCS = RAW / "documents"


def extract(src: Path, fmt: str, outdir: Path) -> tuple[str, int]:
    outdir.mkdir(parents=True, exist_ok=True)
    if fmt == "Word":
        work = outdir / "source.docx"
        shutil.copyfile(src, work)
        media = outdir / "media"
        proc = subprocess.run(
            ["pandoc", str(work), "-t", "gfm", "--wrap=none", f"--extract-media={outdir}"],
            capture_output=True, text=True,
        )
        work.unlink()
        text = proc.stdout
        (outdir / "text.md").write_text(text)
        n_img = len(list(media.glob("*"))) if media.exists() else 0
        return text, n_img
    work = outdir / "source.pdf"
    shutil.copyfile(src, work)
    proc = subprocess.run(["pdftotext", "-layout", str(work), "-"], capture_output=True, text=True)
    work.unlink()
    text = proc.stdout
    (outdir / "text.txt").write_text(text)
    return text, 0


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--chapter", default="croissance", help="mot-clé du libellé de chapitre")
    ap.add_argument("--all", action="store_true")
    args = ap.parse_args()

    catalog = read_json(RAW / "catalog_rubrique18.json")
    entries = catalog["entries"]
    if not args.all:
        entries = [e for e in entries if e["chapter_label"] and args.chapter in e["chapter_label"].lower()]

    index = read_json(RAW / "documents_index.json", {}) or {}
    for e in entries:
        key = str(e["spip_doc_id"])
        meta = fetch(e["official_url"])
        rec = {
            "spip_doc_id": e["spip_doc_id"],
            "official_url": e["official_url"],
            "file_name": e["file_name"],
            "accessible": meta["status"] == 200,
            "retrieved_via": meta.get("via"),
            "retrieved_url": meta.get("fetched_url"),
            "retrieved_at": meta.get("fetched_at"),
            "attempts": meta.get("attempts"),
        }
        if rec["accessible"]:
            text, n_img = extract(Path(meta["path"]), e["format"], DOCS / key)
            rec.update(text_chars=len(text.strip()), images=n_img)
        index[key] = rec
        print(key, "OK" if rec["accessible"] else "INACCESSIBLE", rec.get("retrieved_via"), rec.get("text_chars"), rec.get("images"), flush=True)
    write_json(RAW / "documents_index.json", dict(sorted(index.items(), key=lambda kv: int(kv[0]))))


if __name__ == "__main__":
    main()
