"""Étape 4 — Découpe chaque sujet complet (sujetdebac.fr) en questions d'examen.

Pour chaque session, repère :
  - la/les dissertation(s) : libellé entre « SUJET » et « DOCUMENT 1 »
  - pour chaque épreuve composée (sujets A/B en 2021-2022) : EC1, EC2 (+ 2 questions), EC3
  - format 2022 « sujet B » : partie 1 = plusieurs questions de connaissances (10 pts),
    partie 2 = raisonnement sur dossier (10 pts) -> EC1-Qn et EC3
Chaque question reçoit un identifiant stable : <code officiel>-<partie>[-<variante>][-Q<n>]
ex. 22-SESJ1ME1-DISS, 22-SESJ1ME1-EC2-A, 22-SESJ1ME1-EC1-B-Q2

Le découpage est heuristique : il produit des CANDIDATS (data/raw/segments.json),
vérifiés à la main dans data/editorial/subjects.json.
Usage : python3 -I pipeline/segment.py
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import RAW, EDITORIAL, ROOT, norm_text, read_json, write_json  # noqa: E402

SRC = RAW / "sujetdebac"

EC_HEADER = re.compile(r"^\s*[ÉE]PREUVE\s+COMPOS\S*(?:\s*[-–]\s*SUJET\s+([AB]))?\s*$", re.M | re.I)
DISS_HEADER = re.compile(r"^\s*DISSERTATION(?:\s+S.APPUYANT SUR UN DOSSIER DOCUMENTAIRE)?(?:\s*[-–]\s*SUJET\s+([AB]))?\s*$", re.M | re.I)
PART1 = re.compile(r"Premi[èe]re\s+partie\s*:?\s*Mobilisation des connaissances[^\n]*", re.I)
PART2 = re.compile(r"Deuxi[èe]me\s+partie\s*:?\s*[ÉE]tude d.un document[^\n]*", re.I)
PART3 = re.compile(r"(?:Troisi[èe]me|Deuxi[èe]me)\s+partie\s*:?\s*Raisonnement[^\n]*(?:\n[^\n]*points?\s*\))?", re.I)
QUESTIONS = re.compile(r"Questions?\s*:", re.I)
SUJET3 = re.compile(r"Sujet\s*:\s*", re.I)
SUBQ = re.compile(r"Question\s+(\d)\s*\((\d+(?:,\d+)?)\s*points?\)", re.I)
POINTS = re.compile(r"\(\s*\*?\s*(\d+(?:,\d+)?)\s*points?\s*\*?\s*\)", re.I)
FOOTER = re.compile(r"^.*(Page\s+\d+\s*(/|sur)\s*\d+|\b\d{2}-SES[A-Z0-9]+\b).*$", re.M | re.I)


WATERMARK = re.compile(r"\bEN_[A-Za-z0-9+/=]{12,}\b")


def clean_block(text: str) -> str:
    text = WATERMARK.sub("", FOOTER.sub("", text))  # filigrane numérique des sujets 2025-2026
    return norm_text(text).lstrip(":;.- ").strip()


def pts(s: str) -> float | None:
    m = POINTS.search(s)
    return float(m.group(1).replace(",", ".")) if m else None


def first_stop(text: str, start: int, pats: list[re.Pattern]) -> int:
    end = len(text)
    for p in pats:
        m = p.search(text, start)
        if m and m.start() < end:
            end = m.start()
    return end


DOC1 = re.compile(r"DOCUMENT\s*1\b", re.I)


def segment_session(text: str) -> list[dict]:
    parts: list[dict] = []
    ec_headers = list(EC_HEADER.finditer(text))
    first_ec = ec_headers[0].start() if ec_headers else len(text)
    # --- dissertation(s) : avant la première épreuve composée
    for m in DISS_HEADER.finditer(text[:first_ec]):
        s = re.compile(r"^\s*SUJET\s*(?:[AB])?\s*:?\s*$", re.M).search(text, m.end())
        if not s or s.start() > first_ec:
            continue
        block = text[s.end():first_stop(text, s.end(), [DOC1])]
        block = re.sub(r"Ce sujet comporte .*?documents?\.", "", block, flags=re.S | re.I)
        q = clean_block(block)
        if q:
            parts.append({"part": "DISS", "variant": m.group(1), "question": q, "points": 20.0, "offset": s.end()})
    # --- épreuves composées
    for i, h in enumerate(ec_headers):
        # sans mention explicite « SUJET A/B », plusieurs épreuves composées sont lettrées par ordre d'apparition
        variant = h.group(1) or ("AB"[i] if len(ec_headers) == 2 else None)
        seg_end = ec_headers[i + 1].start() if i + 1 < len(ec_headers) else len(text)
        seg = text[h.end():seg_end]
        base = h.end()
        p1, p2, p3 = PART1.search(seg), PART2.search(seg), PART3.search(seg)
        if p1:
            end1 = p2.start() if p2 else (p3.start() if p3 else len(seg))
            block = seg[p1.end():end1]
            subs = list(SUBQ.finditer(block))
            if subs:  # format 2022 sujet B : plusieurs questions de connaissances
                for j, sq in enumerate(subs):
                    qb = block[sq.end(): subs[j + 1].start() if j + 1 < len(subs) else len(block)]
                    parts.append({"part": "EC1", "variant": variant, "subq": int(sq.group(1)),
                                  "question": clean_block(qb), "points": float(sq.group(2).replace(",", ".")),
                                  "format_note": "Mobilisation des connaissances en plusieurs questions (format 2022, sujet B)",
                                  "offset": base + p1.start()})
            else:
                parts.append({"part": "EC1", "variant": variant, "question": clean_block(POINTS.sub("", block)),
                              "points": pts(p1.group(0)) or pts(block), "offset": base + p1.start()})
        if p2:
            stop = p3.start() if p3 else len(seg)
            q = QUESTIONS.search(seg, p2.end())
            has_q = q is not None and q.start() < stop
            doc_block = seg[p2.end():(q.start() if has_q else stop)]
            qs_block = seg[q.end():stop] if has_q else ""
            raw_qs = [x for x in re.split(r"\n\s*\d\.\s+", "\n" + qs_block) if x.strip()]
            qs = [{"n": k + 1, "text": clean_block(POINTS.sub("", x)), "points": pts(x)} for k, x in enumerate(raw_qs)]
            title_lines = [ln.strip() for ln in doc_block.strip().splitlines() if ln.strip()][:4]
            parts.append({"part": "EC2", "variant": variant, "document_title": clean_block(" ".join(title_lines))[:300],
                          "questions": qs, "question": " / ".join(x["text"] for x in qs),
                          "points": pts(p2.group(0)), "offset": base + p2.start()})
        if p3:
            s = SUJET3.search(seg, p3.end())
            if s:
                block = seg[s.end():first_stop(seg, s.end(), [DOC1])]
                parts.append({"part": "EC3", "variant": variant, "question": clean_block(block),
                              "points": pts(p3.group(0)), "offset": base + p3.start()})
    return parts


def main() -> None:
    index = read_json(RAW / "sujetdebac_index.json", {}) or {}
    # codes officiels complétés à la main quand l'extraction automatique échoue (voir le fichier)
    overrides = read_json(EDITORIAL / "session_overrides.json", {}) or {}
    out = {}
    for slug, rec in sorted(index.items()):
        f = SRC / slug / "sujet.txt"
        ov = overrides.get(slug, {})
        if ov.get("exclude"):
            continue
        code = ov.get("official_code") or rec.get("official_code") or ov.get("id_prefix")
        text = f.read_text() if f.exists() else ""
        parts = segment_session(text) if len(text.strip()) > 200 else []
        for p in parts:
            bits = [code or slug, p["part"], p["variant"], f"Q{p['subq']}" if p.get("subq") else None]
            p["id"] = "-".join(b for b in bits if b)
        out[slug] = {"official_code": code, "year": rec["year"], "parts": parts,
                     "text_available": len(text.strip()) > 200}
        print(slug[26:], code, [p["id"].split("-", 2)[-1] for p in parts])
    extra = read_json(EDITORIAL / "extra_sessions.json", {}) or {}
    for slug, ex in extra.items():
        if slug.startswith("_"):
            continue
        f = ROOT / ex["text_path"]
        text = f.read_text() if f.exists() else ""
        parts = segment_session(text) if len(text.strip()) > 200 else []
        for p in parts:
            bits = [ex["official_code"], p["part"], p["variant"], f"Q{p['subq']}" if p.get("subq") else None]
            p["id"] = "-".join(b for b in bits if b)
        out[slug] = {"official_code": ex["official_code"], "year": ex["year"], "parts": parts,
                     "text_available": bool(parts), "source": ex["source"], "text_path": ex["text_path"]}
        print(slug, ex["official_code"], [p["id"].split("-", 2)[-1] for p in parts] or "TEXTE INDISPONIBLE")
    ids = [p["id"] for s in out.values() for p in s["parts"]]
    dupes = sorted({i for i in ids if ids.count(i) > 1})
    if dupes:
        print("IDENTIFIANTS EN DOUBLE :", dupes)
    write_json(RAW / "segments.json", out)


if __name__ == "__main__":
    main()
