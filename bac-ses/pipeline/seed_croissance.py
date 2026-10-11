"""Amorce (à exécuter UNE fois) du fichier éditorial data/editorial/croissance_subjects.json.

Les décisions d'inclusion/exclusion ci-dessous ont été prises À LA MAIN après lecture
du texte intégral de chaque question candidate (voir data/raw/classification_candidates.json),
en se référant aux objectifs d'apprentissage du questionnement « Quels sont les sources et
les défis de la croissance économique ? » (programme de Terminale, BO spécial n° 8 du 25-7-2019).

Le fichier généré est ensuite enrichi à la main (notions, accès, notes). Le script refuse
d'écraser un fichier existant, sauf --force.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import EDITORIAL, RAW, read_json, write_json  # noqa: E402

INCLUDE = """
21-SESJ1AN1-EC2-A 21-SESJ1AN1-EC1-B 21-SESJ1JA1-EC2-A 21-SESJ1JA1-EC3-B 21-SESJ1G11-DISS 21-SESJ1G11-EC2-B
21-SESJ1ME2-EC1-B 21-SESJ2ME2-EC2-B INT-21-ME-J1-DISS 21-SESJ1ME3-DISS INT-21-ME-J2-EC3-B 21-SESJ2ME3-EC1-A
21-SESJ1PO1-EC1-B
22-SESJ1AN1-EC1-B-Q1 22-SESJ2AN1-EC3-A 22-SESJ1AS1-EC1-B-Q1 22-SESJ2AS1-EC1-A 22-SESJ1JA1-DISS
22-SESJ2JA1-EC1-B-Q1 22-SESJ1G11-EC1-B-Q2 22-SESJ2G11-EC3-A 22-SESJ1LR1-DISS 22-SESJ2LR1-EC3-A 22-SESJ1ME1-DISS
22-SESJ1ME3-EC3-A 22-SESJ2ME1-EC2-A 22-SESJ2ME1-EC1-B-Q2 22-SESJ2ME3-EC1-A 22-SESJ1NC1-EC1-B-Q2 22-SESJ2NC1-DISS
22-SESJ1PO1-EC2-A 22-SESJ1PO1-EC1-B-Q1 22-SESJ2PO1-EC1-B-Q2 22-SESJ2PO3-EC1-B-Q1
23-SESJ2AN1-EC1 23-SESJ2AS1-EC3 23-SESJ1JA1-DISS 23-SESJ2JA1-EC1 23-SESJ2G11-EC3 23-SESJ1LI1-EC3 23-SESJ1ME1-EC2
23-SESJ1NC1-EC2 23-SESJ2NC1-EC3 23-SESJ1PO1-DISS 23-SESJ2PO1-EC1
24-SESJ1JA1-EC3 24-SESJ2JA1-EC2 24-SESJ1G11-DISS 24-SESJ2G11-EC2 24-SESJ1PO1-EC3 24-SESJ2PO1-EC1 24-SESG11BIS-EC2 24-SESJ2AS1-EC2
25-SESJ2AN1-EC1 25-SESJ1AS1-EC1 25-SESJ2G11-EC2 25-SESJ1ME1-EC2 25-SESJ1NC1-EC1 25-SESJ1PO1-EC2 25-SESJ2PO1-EC1
26-SESJ1AN1-DISS 26-SESJ2AN1-EC2 26-SESJ1AG1-EC1 26-SESJ1JA1-EC1 26-SESJ2JA1-EC2 26-SESJ1ME3-DISS 26-SESJ2PO1-EC1
""".split()

# En 2022, l'EC3 du sujet A est reproduit à l'identique (question + dossier, vérifié) comme
# partie 2 du sujet B : un seul exercice, deux emplacements dans l'épreuve.
SAME_EXERCISE_B = {
    "22-SESJ2AN1-EC3-A": "22-SESJ2AN1-EC3-B",
    "22-SESJ2G11-EC3-A": "22-SESJ2G11-EC3-B",
    "22-SESJ2LR1-EC3-A": "22-SESJ2LR1-EC3-B",
    "22-SESJ1ME3-EC3-A": "22-SESJ1ME3-EC3-B",
}

EXCLUDED = {
    "INT-21-ME-J1-EC2-A": "Croissance du PIB mise en relation avec le chômage : questionnement « Comment lutter contre le chômage ? » (classement Versailles concordant).",
    "21-SESJ1PO1-EC2-B": "Fluctuations et chômage conjoncturel : chapitre chômage (Versailles concordant).",
    "21-SESJ2G11-EC2-B": "Productivité des firmes et capacité à exporter : chapitre commerce international.",
    "21-SESJ2PO1-EC2-B": "Productivité des firmes et compétitivité : chapitre commerce international.",
    "22-SESJ2AN1-EC2-A": "Dotations factorielles et technologiques, spécialisation : commerce international (Versailles concordant).",
    "22-SESJ2AN1-EC1-B-Q1": "Effet du marché unique sur la croissance : questionnement « Quelles politiques économiques dans le cadre européen ? » (Versailles concordant).",
    "22-SESJ2AS1-EC2-A": "Choc asymétrique en zone euro : chapitre politiques européennes.",
    "22-SESJ1NC1-EC3-A": "Productivité des firmes et compétitivité : commerce international (Versailles concordant).",
    "22-SESJ1NC1-EC3-B": "Même exercice que 22-SESJ1NC1-EC3-A (commerce international).",
    "22-SESJ2PO3-EC2-A": "Commerce entre pays comparables : commerce international.",
    "23-SESJ2AN1-EC3": "Institutions et chômage structurel : chapitre chômage (Versailles concordant).",
    "23-SESJ2ME1-EC2": "Qualification et structure socioprofessionnelle : chapitre structure sociale (Versailles concordant).",
    "23-SESJ2NC1-EC2": "Politiques de formation et chômage : chapitre chômage.",
    "24-SESJ1AN1-EC1": "Effets du marché unique : chapitre politiques européennes (Versailles concordant).",
    "24-SESJ2PO1-EC2": "Milieu social et trajectoires de formation : questionnement sur l'école, hors écrit à partir de 2027.",
    "24-SESJ2AN1-EC2": "Prix des logements et chômage : hors chapitre croissance.",
    "24-SESJ1PO3-EC2": "Écarts de dotations technologiques et commerce : commerce international.",
    "25-SESJ1AS1-EC2": "Fluctuations et chômage conjoncturel : chapitre chômage (Versailles concordant).",
    "25-SESJ2JA1-EC1": "Effet du marché unique : chapitre politiques européennes (Versailles concordant).",
    "25-SESJ2JA1-EC2": "Fluctuations et chômage conjoncturel : chapitre chômage (Versailles concordant).",
    "25-SESJ2ME3-EC2": "Marché unique : chapitre politiques européennes (Versailles concordant).",
    "25-SESJ1ME2-EC1": "Institutions et chômage structurel : chapitre chômage.",
    "25-SESJ2NC1-EC2": "Commerce international et inégalités entre pays : commerce international.",
    "26-SESJ1AN1-EC2": "Coordination des politiques en zone euro : chapitre politiques européennes.",
    "26-SESJ1ME1-EC3": "Productivité des firmes et compétitivité : commerce international.",
}

# Questions retenues mais absentes de la segmentation automatique (sources : voir notes).
MANUAL = [
    {
        "id": "23-SESJ1AS1-EC1",
        "session_slug": "spe-sciences-eco-sociales-2023-amerique-sud-1",
        "part": "EC1", "variant": None, "subq": None,
        "question": "Montrez le lien entre le progrès technique et l'accroissement de la productivité globale des facteurs.",
        "points": 4.0,
        "question_source": "Libellé lu dans le corrigé officiel 23-SESJ1AS1 (le PDF du sujet relayé par sujetdebac.fr est un scan sans texte). À vérifier sur le PDF du sujet.",
        "verification_status": "a_verifier",
    },
]

TO_VERIFY = [
    {
        "id": "VERS-218-EC1",
        "note": "Tuile datée « 2020, France métropolitaine, Normale » sur le site de Versailles (fichier 2020_metro_norm_ec_2.docx). "
                "La première session des épreuves de spécialité étant 2021, la nature exacte de ce sujet (sujet d'examen, sujet "
                "préparé pour une session annulée, ou sujet d'entraînement) n'a pas pu être établie. Non publié tant que non vérifié.",
        "question": "Comment les droits de propriété favorisent-ils la croissance économique ?",
        "versailles_doc_ids": [218],
    },
]

OUT_OF_SCOPE = [
    {"versailles_doc_ids": [789, 792], "note": "Sujets de l'épreuve orale de contrôle (2022, métropole) : hors périmètre de l'épreuve écrite. Recensés, non publiés."},
]

VERBS = ["montrerez", "montrez", "expliquerez", "expliquez", "présenterez", "présentez", "comparerez", "comparez",
         "caractériserez", "caractérisez", "distinguerez", "distinguez"]


def instruction_verb(q: str, part: str) -> str | None:
    if part == "DISS":
        return "question de dissertation"
    low = q.lower()
    hits = [(low.find(v), v) for v in VERBS if v in low]
    if not hits:
        return None
    v = min(hits)[1]
    return {"montrerez": "montrer", "montrez": "montrer", "expliquerez": "expliquer", "expliquez": "expliquer",
            "présenterez": "présenter", "présentez": "présenter", "comparerez": "comparer", "comparez": "comparer",
            "caractériserez": "caractériser", "caractérisez": "caractériser", "distinguerez": "distinguer",
            "distinguez": "distinguer"}[v]


def main() -> None:
    target = EDITORIAL / "croissance_subjects.json"
    if target.exists() and "--force" not in sys.argv:
        sys.exit(f"{target} existe déjà (contenu éditorial) : utilisez --force pour l'écraser.")
    cands = {o["id"]: o for o in read_json(RAW / "classification_candidates.json")}
    segs = read_json(RAW / "segments.json")
    parts = {p["id"]: (slug, p) for slug, s in segs.items() for p in s["parts"]}
    subjects = []
    for sid in INCLUDE:
        slug, p = parts[sid]
        vm = cands[sid].get("versailles_match")
        q = p["question"]
        rec = {
            "id": sid, "session_slug": slug, "part": p["part"], "variant": p.get("variant"), "subq": p.get("subq"),
            "chapter": "croissance", "points": p.get("points"),
            "question": q if p["part"] != "EC2" else (p.get("document_title") or ""),
            "sub_questions": p.get("questions", []),
            "instruction_verb": instruction_verb(p["questions"][-1]["text"] if p["part"] == "EC2" and p.get("questions") else q, p["part"]),
            "versailles_doc_ids": [vm["spip_doc_id"]] if vm and vm.get("chapter_label") and "croissance" in vm["chapter_label"].lower() else [],
            "also_appears_as": [SAME_EXERCISE_B[sid]] if sid in SAME_EXERCISE_B else [],
            "format_note": p.get("format_note"),
            "notions": [], "access_tier": "premium",
            "verification_status": "verifie_source_tierce",
            "inclusion_reason": "Relève du questionnement croissance (lecture manuelle de la question).",
        }
        subjects.append(rec)
    for m in MANUAL:
        subjects.append({"chapter": "croissance", "notions": [], "access_tier": "premium", "also_appears_as": [],
                         "versailles_doc_ids": [], "sub_questions": [], "format_note": None,
                         "instruction_verb": None, **m})
    out = {
        "_doc": "Contenu éditorial : liste des questions rattachées au chapitre Croissance, avec décisions justifiées. "
                "Généré une fois par pipeline/seed_croissance.py puis édité à la main.",
        "subjects": subjects,
        "excluded_candidates": [{"id": k, "reason": v} for k, v in EXCLUDED.items()],
        "to_verify": TO_VERIFY,
        "out_of_scope": OUT_OF_SCOPE,
    }
    write_json(target, out)
    print(f"{len(subjects)} sujets retenus, {len(EXCLUDED)} candidats exclus, {len(TO_VERIFY)} à vérifier")


if __name__ == "__main__":
    main()
