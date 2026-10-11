"""Étape 3 — Recense les sujets et « corrigés officiels » relayés par sujetdebac.fr (2021 → 2026).

sujetdebac.fr republie les sujets nationaux et les documents de correction transmis aux
correcteurs (en-tête du type « 22-SESJ1ME1C » : le suffixe C désigne le corrigé du sujet
22-SESJ1ME1). Ce site n'est pas institutionnel : la provenance est conservée et chaque
document est marqué « officiel, relayé par un tiers » dans les données.

robots.txt (vérifié) : seules /recherche et /recherche.php sont interdites.
Usage : python3 -I pipeline/collect_sujetdebac.py
Sorties : data/raw/sujetdebac/<session>/{sujet.txt,corrige.txt}, data/raw/sujetdebac_index.json
"""
from __future__ import annotations

import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import RAW, fetch, read_json, write_json  # noqa: E402

BASE = "https://www.sujetdebac.fr"
YEARS = range(2021, 2027)
OUT = RAW / "sujetdebac"
CODE_RE = re.compile(r"\b(\d{2}-SES[A-Z0-9]+?)(C?)\b")


def pdf_text(path: Path) -> str:
    work = path.with_suffix(".tmp.pdf")
    shutil.copyfile(path, work)
    out = subprocess.run(["pdftotext", "-layout", str(work), "-"], capture_output=True, text=True).stdout
    work.unlink()
    return out


def main() -> None:
    index = read_json(RAW / "sujetdebac_index.json", {}) or {}
    for year in YEARS:
        meta = fetch(f"{BASE}/annales/specialites/spe-sciences-eco-sociales/{year}/", allow_archive=False)
        if meta["status"] != 200:
            print("année inaccessible", year)
            continue
        listing = Path(meta["path"]).read_text(errors="replace")
        slugs = sorted(set(re.findall(r'href="/annales/(spe-sciences-eco-sociales-%d-[^"/]+)"' % year, listing)))
        for slug in slugs:
            page = fetch(f"{BASE}/annales/{slug}", allow_archive=False)
            rec = {"session_slug": slug, "year": year, "page_url": f"{BASE}/annales/{slug}", "files": {}}
            if page["status"] != 200:
                rec["error"] = "page inaccessible"
                index[slug] = rec
                continue
            html = Path(page["path"]).read_text(errors="replace")
            for href in sorted(set(re.findall(r'href="(/annales-pdf/[^"]+\.pdf)"', html))):
                kind = "corrige" if "corrige" in href else "sujet" if "sujet" in href else "autre"
                url = BASE + href
                f = fetch(url, allow_archive=False)
                time.sleep(0.5)
                entry = {"url": url, "accessible": f["status"] == 200}
                if entry["accessible"]:
                    text = pdf_text(Path(f["path"]))
                    d = OUT / slug
                    d.mkdir(parents=True, exist_ok=True)
                    (d / f"{kind}.txt").write_text(text)
                    codes = sorted({m.group(1) + m.group(2) for m in CODE_RE.finditer(text)})
                    entry.update(chars=len(text.strip()), codes=codes)
                rec["files"][kind] = entry
            sujet_codes = [c for c in rec["files"].get("sujet", {}).get("codes", []) if not c.endswith("C")]
            rec["official_code"] = sujet_codes[0] if sujet_codes else None
            index[slug] = rec
            print(slug, rec.get("official_code"), {k: v.get("accessible") for k, v in rec["files"].items()}, flush=True)
    write_json(RAW / "sujetdebac_index.json", dict(sorted(index.items())))


if __name__ == "__main__":
    main()
