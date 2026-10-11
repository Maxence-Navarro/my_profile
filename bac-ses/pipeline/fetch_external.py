"""Récupère les corrigés / ressources tiers référencés dans data/editorial/external_sources.json
et en extrait le texte pour comparaison (data/raw/external/<id>.txt, NON versionné : droits d'auteur).

Usage : python3 -I pipeline/fetch_external.py [id ...]
Seules les références (URL, auteur, date, évaluation) sont publiées ; le texte n'est jamais reproduit.
"""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import EDITORIAL, RAW, fetch, read_json  # noqa: E402

OUT = RAW / "external"


def to_text(src: Path, url: str, dest_dir: Path) -> str:
    ext = url.split("?")[0].rsplit(".", 1)[-1].lower()
    work = dest_dir / f"source.{ext if ext in ('pdf', 'docx', 'odt', 'doc', 'html') else 'html'}"
    shutil.copyfile(src, work)
    try:
        if ext == "pdf":
            return subprocess.run(["pdftotext", "-layout", str(work), "-"], capture_output=True, text=True).stdout
        if ext in ("docx", "odt"):
            return subprocess.run(["pandoc", str(work), "-t", "plain", "--wrap=none"], capture_output=True, text=True).stdout
        if ext == "doc":
            subprocess.run(["soffice", "--headless", "--convert-to", "txt:Text", "--outdir", str(dest_dir), str(work)], capture_output=True)
            t = dest_dir / "source.txt"
            return t.read_text(errors="replace") if t.exists() else ""
        return subprocess.run(["pandoc", str(work), "-f", "html", "-t", "plain", "--wrap=none"], capture_output=True, text=True).stdout
    finally:
        work.unlink(missing_ok=True)


def main() -> None:
    srcs = read_json(EDITORIAL / "external_sources.json")["sources"]
    only = set(sys.argv[1:])
    for s in srcs:
        if only and s["id"] not in only:
            continue
        d = OUT / s["id"]
        d.mkdir(parents=True, exist_ok=True)
        m = fetch(s["url"], allow_archive=True)
        if m["status"] != 200:
            print(s["id"], "INACCESSIBLE", [a["status"] for a in m["attempts"]])
            continue
        text = to_text(Path(m["path"]), s["url"], d)
        (d / "text.txt").write_text(text)
        print(s["id"], "OK", m["via"], len(text))


if __name__ == "__main__":
    main()
