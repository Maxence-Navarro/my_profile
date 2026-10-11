"""Étape 5 — Pré-classe chaque question segmentée par chapitre (heuristique par mots-clés).

Produit data/raw/classification_candidates.json : pour chaque question, les chapitres
candidats et les mots-clés détectés. Ce n'est qu'une AIDE : la décision finale
(rattachement au chapitre) est prise et justifiée dans data/editorial/subjects.json.
On recoupe aussi avec le libellé de chapitre attribué par le catalogue de Versailles
lorsque la même question y figure.

Usage : python3 -I pipeline/classify.py
"""
from __future__ import annotations

import re
import sys
from difflib import SequenceMatcher
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import RAW, norm_text, read_json, write_json  # noqa: E402

KEYWORDS = {
    "croissance": [
        r"croissance", r"\bPIB\b", r"productivit", r"\bPGF\b", r"progr[eè]s technique", r"innovation",
        r"endog[eè]ne", r"droits? de propri[ée]t[ée]", r"institutions?", r"destruction cr[ée]atrice",
        r"limites? [ée]cologiques?", r"soutenable", r"brevets?", r"accumulation des facteurs",
        r"facteurs? de production", r"in[ée]galit[ée]s de revenus",
    ],
    "commerce": [r"commerce international", r"avantage comparatif", r"dotations factorielles", r"protectionnisme", r"cha[iî]ne de valeur", r"firmes? multinationales?", r"pays comparables", r"diff[ée]renciation des produits"],
    "chomage": [r"ch[ôo]mage", r"appariement", r"salaire d.efficience", r"rigidit[ée]s"],
    "europe": [r"europ[ée]en", r"union europ[ée]enne", r"zone euro", r"march[ée] unique", r"politique mon[ée]taire", r"politique budg[ée]taire", r"BCE"],
    "structure-sociale": [r"classes? sociales?", r"structure socioprofessionnelle", r"espace social", r"PCS", r"cat[ée]gorie socioprofessionnelle"],
    "mobilite": [r"mobilit[ée] sociale", r"tables? de mobilit[ée]", r"destin[ée]e", r"reproduction sociale"],
    "travail": [r"organisation du travail", r"taylor", r"emploi", r"int[ée]gration sociale", r"num[ée]rique", r"qualit[ée] de l.emploi"],
    "engagement": [r"engagement politique", r"action collective", r"incitations s[ée]lectives", r"paradoxe de l.action collective", r"syndica", r"r[ée]tributions symboliques"],
    "environnement": [r"environnement", r"externalit[ée]s", r"taxation", r"quotas", r"r[ée]glementation", r"n[ée]gociations internationales", r"bien commun", r"COP"],
    "hors-ecrit": [r"[ée]cole", r"justice sociale", r"crises? financi[eè]res?", r"syst[eè]me financier", r"in[ée]galit[ée]s"],
}


BOILERPLATE = re.compile(
    r"^(à|a) l.aide (de vos connaissances et )?(du|des données du|de données du) (dossier documentaire|document)( et de vos connaissances)?,?\s*", re.I)


def core(text: str) -> str:
    """Retire la formule de consigne commune pour comparer le cœur de la question."""
    return BOILERPLATE.sub("", norm_text(text).lower())


def match_versailles(question: str, catalog: list[dict]) -> dict | None:
    q = core(question)
    best, best_r = None, 0.0
    for e in catalog:
        r = SequenceMatcher(None, q[:220], core(e["title"])[:220]).ratio()
        if r > best_r:
            best, best_r = e, r
    if best and best_r >= 0.8:
        return {"spip_doc_id": best["spip_doc_id"], "chapter_label": best["chapter_label"], "ratio": round(best_r, 3),
                "year": best["year"], "lieu": best["lieu"], "session": best["session"], "exercise_type": best["exercise_type"]}
    return None


def main() -> None:
    segments = read_json(RAW / "segments.json")
    catalog = read_json(RAW / "catalog_rubrique18.json")["entries"]
    out = []
    for slug, sess in segments.items():
        for p in sess["parts"]:
            text = p["question"] + " " + p.get("document_title", "")
            hits = {ch: sorted({m.group(0).lower() for k in kws for m in re.finditer(k, text, re.I)})
                    for ch, kws in KEYWORDS.items()}
            hits = {k: v for k, v in hits.items() if v}
            out.append({
                "id": p["id"], "session_slug": slug, "year": sess["year"], "part": p["part"], "variant": p["variant"],
                "question": p["question"], "document_title": p.get("document_title"),
                "keyword_hits": hits,
                "croissance_candidate": "croissance" in hits,
                "versailles_match": match_versailles(p["question"] if p["part"] != "EC2" else (p.get("document_title") or ""), catalog)
                or (match_versailles(p["questions"][-1]["text"], catalog) if p["part"] == "EC2" and p.get("questions") else None),
            })
    write_json(RAW / "classification_candidates.json", out)
    cands = [o for o in out if o["croissance_candidate"]]
    print(f"{len(out)} questions segmentées, {len(cands)} candidates « croissance » (mots-clés)")


if __name__ == "__main__":
    main()
