"""Étape 6 — Fusionne données brutes + contenus éditoriaux -> data/published (consommé par le site).

Entrées :
  data/raw/...                         collecte (catalogue Versailles, sujetdebac, segments)
  data/editorial/croissance_subjects.json   questions retenues + décisions
  data/editorial/grids/<id>.json       éléments attendus extraits du corrigé officiel (saisie manuelle)
  data/editorial/answers/<id>.md       corrigés rédigés (en-tête JSON + Markdown)
  data/editorial/relations.json        relations entre sujets proches
  data/editorial/access.json           répartition gratuit / premium (configurable)
Sorties :
  data/published/{chapters,subjects,meta,inventory}.json, inventory.csv, subjects/<slug>.json, answers/<id>.json
  data/raw/grid_excerpts/<id>.txt      extrait du corrigé officiel localisé pour chaque question (aide à la saisie)

Usage : python3 -I pipeline/build.py
Idempotent : data/published est entièrement régénéré à chaque exécution.
"""
from __future__ import annotations

import csv
import io
import json
import re
import shutil
import sys
import time
from difflib import SequenceMatcher
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import EDITORIAL, PUBLISHED, RAW, ROOT, norm_text, read_json, write_json  # noqa: E402

CHAPTERS = [
    # id, n°, titre, titre court, champ, statut, résumé
    ("croissance", 1, "Quels sont les sources et les défis de la croissance économique ?", "Croissance économique", "science-economique", "published",
     "Sources de la croissance (accumulation des facteurs, productivité globale des facteurs), progrès technique endogène, "
     "rôle des institutions et des droits de propriété, destruction créatrice, inégalités de revenus et limites écologiques "
     "d'une croissance soutenable."),
    ("commerce", 2, "Quels sont les fondements du commerce international et de l'internationalisation de la production ?", "Commerce international", "science-economique", "coming_soon", None),
    ("chomage", 3, "Comment lutter contre le chômage ?", "Chômage", "science-economique", "coming_soon", None),
    ("europe", 4, "Quelles politiques économiques dans le cadre européen ?", "Politiques européennes", "science-economique", "coming_soon", None),
    ("structure-sociale", 5, "Comment est structurée la société française actuelle ?", "Structure sociale", "sociologie-science-politique", "coming_soon", None),
    ("mobilite", 6, "Quels sont les caractéristiques contemporaines et les facteurs de la mobilité sociale ?", "Mobilité sociale", "sociologie-science-politique", "coming_soon", None),
    ("travail", 7, "Quelles mutations du travail et de l'emploi ?", "Travail et emploi", "sociologie-science-politique", "coming_soon", None),
    ("engagement", 8, "Comment expliquer l'engagement politique dans les sociétés démocratiques ?", "Engagement politique", "sociologie-science-politique", "coming_soon", None),
    ("environnement", 9, "Quelle action publique pour l'environnement ?", "Action publique pour l'environnement", "regards-croises", "coming_soon", None),
]

PLACES = {
    "metropole": "France métropolitaine", "metro-cand-libre": "France métropolitaine (candidats libres)",
    "amerique-nord": "Amérique du Nord", "amerique-sud": "Amérique du Sud", "asie": "Asie",
    "centres-etranger": "Centres étrangers", "polynesie": "Polynésie", "nouv-caledonie": "Nouvelle-Calédonie",
    "la-reunion": "La Réunion", "liban": "Liban", "mayotte-liban": "Mayotte – Liban", "suede": "Centres étrangers (sujet bis)",
    "antilles-guyane": "Antilles – Guyane",
}
PART_TYPE = {"DISS": "dissertation", "EC1": "EC1", "EC2": "EC2", "EC3": "EC3"}
SUJETDEBAC_PAGE = "https://www.sujetdebac.fr/annales/{slug}"


def session_meta(slug: str, code: str | None, extra: dict | None) -> dict:
    if extra:
        m = re.match(r"versailles-(\d{4})-(.+)-(\d)$", slug)
        return {"year": int(m.group(1)), "center": PLACES.get(m.group(2), m.group(2)), "session": "normale", "day": f"J{m.group(3)}"}
    m = re.match(r"spe-sciences-eco-sociales-(\d{4})-(.+?)-(\d|secours\d|2bis)(?:-(remplacement))?$", slug)
    year, place, n, rempl = int(m.group(1)), m.group(2), m.group(3), m.group(4)
    session = "remplacement" if rempl else ("secours" if n.startswith("secours") else ("candidats libres" if place == "metro-cand-libre" else "normale"))
    day = None
    if code:
        d = re.search(r"SESJ(\d)", code)
        day = f"J{d.group(1)}" if d else None
    if not day and n.isdigit():
        day = f"J{n}"
    return {"year": year, "center": PLACES.get(place, place), "session": session, "day": day}


BOILER = re.compile(r"^(à|a) l.aide (de vos connaissances et )?(du|des données du|de données du|de) ?(dossier documentaire|document|deux exemples|d.un exemple)?( et de vos connaissances)?,?\s*", re.I)


def core(text: str) -> str:
    return BOILER.sub("", norm_text(text).lower())


PART_HEAD = re.compile(r"^\s*(?:Premi[èe]re|Deuxi[èe]me|Troisi[èe]me)\s+partie|^\s*[ÉE]PREUVE\s+COMPOS|^\s*DISSERTATION|^\s*Question\s+\d\s*\(", re.M | re.I)


def locate_in_corrige(question: str, corrige: str) -> tuple[float, str]:
    """Cherche le libellé de la question dans le corrigé officiel ; renvoie (score, extrait de la section)."""
    q = core(question)[:160]
    if not q:
        return 0.0, ""
    flat = norm_text(corrige)
    best, best_i = 0.0, -1
    step = 40
    window = len(q) + 30
    low = flat.lower()
    for i in range(0, max(1, len(low) - window), step):
        r = SequenceMatcher(None, q, low[i:i + window]).ratio()
        if r > best:
            best, best_i = r, i
    if best_i < 0:
        return 0.0, ""
    # affine
    for i in range(max(0, best_i - step), best_i + step):
        r = SequenceMatcher(None, q, low[i:i + window]).ratio()
        if r > best:
            best, best_i = r, i
    # extrait : depuis la question jusqu'au prochain en-tête de partie dans le texte d'origine
    anchor = flat[best_i:best_i + 60]
    raw_i = corrige.replace("\n", " ").find(anchor[:30])
    raw = corrige
    start = 0
    if raw_i >= 0:
        # retrouver la position approximative dans le texte brut via le nombre de caractères non-espaces
        target = len(re.sub(r"\s", "", flat[:best_i]))
        cnt = 0
        for k, ch in enumerate(raw):
            if not ch.isspace():
                cnt += 1
            if cnt >= target:
                start = k
                break
    nxt = PART_HEAD.search(raw, start + 200)
    end = nxt.start() if nxt else len(raw)
    return round(best, 3), raw[max(0, start - 300):end]


DOC_RE = re.compile(r"^\s*DOCUMENT\s*(\d)\b", re.M | re.I)
SRC_RE = re.compile(r"^\s*Sources?\s*:\s*(.+)$", re.M)


def document_listing(seg_text: str) -> list[dict]:
    docs = []
    heads = list(DOC_RE.finditer(seg_text))
    for i, h in enumerate(heads):
        end = heads[i + 1].start() if i + 1 < len(heads) else len(seg_text)
        body = seg_text[h.end():end]
        src = SRC_RE.search(body)
        first = next((ln.strip() for ln in body.splitlines() if ln.strip()), "")
        title = norm_text(first) if len(first) < 150 and not first.endswith(".") else None
        docs.append({"n": int(h.group(1)), "title": title, "source": norm_text(src.group(1)) if src else None})
    return docs


def parse_answer(path: Path) -> dict:
    """Corrigé : en-tête JSON entre les lignes '---json' et '---', puis Markdown."""
    text = path.read_text()
    m = re.match(r"---json\n(.*?)\n---\n(.*)$", text, re.S)
    if not m:
        raise ValueError(f"{path} : en-tête JSON manquant")
    head = json.loads(m.group(1))
    head["contentMd"] = m.group(2).strip()
    return head


PROGRAMME_SOURCE = {
    "label": "Programme de SES de Terminale (BO spécial n° 8 du 25 juillet 2019) — objectifs d'apprentissage du chapitre",
    "url": "https://www.education.gouv.fr/bo/19/Special8/MENE1921253A.htm", "kind": "officiel",
    "note": "Lien identifié par moteur de recherche (page non consultable depuis l'environnement de collecte) ; "
            "texte des objectifs vérifié par ses citations dans les corrigés officiels.",
}


def resolve_sources(items: list, corr_url: str | None, code: str | None, externals: dict) -> list[dict]:
    """Développe les raccourcis de sources des corrigés : @programme, @corrige-officiel, @ext:<id>[|note]."""
    out = []
    for it in items:
        if isinstance(it, dict):
            out.append(it)
            continue
        key, _, note = it.partition("|")
        if key == "@programme":
            out.append(PROGRAMME_SOURCE)
        elif key == "@corrige-officiel":
            if not corr_url:
                raise ValueError(f"@corrige-officiel utilisé sans corrigé officiel ({code})")
            out.append({"label": f"Proposition de corrigé officielle {code}C (relayée par sujetdebac.fr)", "url": corr_url,
                        "kind": "tiers-relai-officiel", "note": note or "Grille de contrôle principale."})
        elif key.startswith("@ext:"):
            e = externals[key[5:]]
            out.append({"label": f"{e.get('label') or e['kind'].capitalize()} — {e['author']}", "url": e["url"], "kind": "tiers",
                        **({"note": note} if note else {})})
        else:
            raise ValueError(f"source inconnue : {it}")
    return out


def is_official_corrige(text: str) -> bool:
    """Marqueurs des propositions de corrigé ministérielles : en-tête « PROPOSITION DE CORRIGÉ » et tableau
    « Programme officiel », ou code de sujet suffixé par C (ex. 22-SESJ1ME1C). Un corrigé rédigé à la première
    personne par un enseignant (« J'y ai abordé… ») n'en porte aucun."""
    if re.search(r"\b\d{2}-SES[A-Z0-9]+C\b", text):
        return True
    return bool(re.search(r"PROPOSITION DE CORRIG", text) and re.search(r"Programme officiel", text, re.I))


unofficial_corrige_sessions: set[str] = set()


def main() -> None:
    t0 = time.time()
    externals = {e["id"]: e for e in read_json(EDITORIAL / "external_sources.json")["sources"]}
    ed = read_json(EDITORIAL / "croissance_subjects.json")
    segs = read_json(RAW / "segments.json")
    sdb = read_json(RAW / "sujetdebac_index.json")
    overrides = read_json(EDITORIAL / "session_overrides.json", {}) or {}
    extra = read_json(EDITORIAL / "extra_sessions.json", {}) or {}
    catalog = {e["spip_doc_id"]: e for e in read_json(RAW / "catalog_rubrique18.json")["entries"]}
    docidx = read_json(RAW / "documents_index.json", {}) or {}
    relations = read_json(EDITORIAL / "relations.json", {"relations": []})["relations"]
    access = read_json(EDITORIAL / "access.json", {"default": "premium", "free": []})
    parts_by_id = {p["id"]: (slug, p) for slug, s in segs.items() for p in s["parts"]}

    if PUBLISHED.exists():
        shutil.rmtree(PUBLISHED)
    (PUBLISHED / "subjects").mkdir(parents=True)
    (PUBLISHED / "answers").mkdir(parents=True)
    excerpts_dir = RAW / "grid_excerpts"
    excerpts_dir.mkdir(parents=True, exist_ok=True)

    details, summaries, inventory = [], [], []
    annotations = read_json(EDITORIAL / "subject_annotations.json", {}) or {}
    for s in ed["subjects"]:
        sid = s["id"]
        ann = annotations.get(sid, {})
        s = {**s, **{k: v for k, v in ann.items() if k in ("notions", "external_corrections", "access_tier")}}
        slug_session = s.get("session_slug")
        seg_slug, seg = parts_by_id.get(sid, (slug_session, None))
        slug_session = slug_session or seg_slug
        sess = segs.get(slug_session, {})
        code = sess.get("official_code") or s.get("official_code")
        ex = extra.get(slug_session)
        meta = session_meta(slug_session, code, ex)
        ov = overrides.get(slug_session, {})
        rec_sdb = sdb.get(slug_session, {})
        exam_code_official = bool(code) and not str(code).startswith("INT-")

        # ---- sources
        sources = []
        if rec_sdb.get("files", {}).get("sujet", {}).get("accessible"):
            sources.append({"label": f"Sujet officiel {code or ''} (PDF)".strip(), "url": rec_sdb["files"]["sujet"]["url"],
                            "kind": "tiers-relai-officiel", "note": "Sujet national relayé par sujetdebac.fr."})
        for d in s.get("versailles_doc_ids", []):
            e = catalog.get(d)
            di = docidx.get(str(d), {})
            if e:
                sources.append({"label": f"Académie de Versailles — fiche du sujet (doc. {d}, {e['file_name']})", "url": e["official_url"],
                                "kind": "officiel", "note": f"Classement Versailles : {e['exercise_type_label']} · {e['chapter_label']} · {e['lieu'] or 'lieu non indiqué'} · {e['year']} · {e['session']}."})
                if di.get("retrieved_url"):
                    sources.append({"label": f"Copie d'archive du document Versailles {d}", "url": di["retrieved_url"], "kind": "archive",
                                    "note": "Le site de l'académie était injoignable lors de la collecte ; document lu via la Wayback Machine."})
        if ex:
            sources.append({"label": "Source du sujet", "url": "https://ses.ac-versailles.fr/spip.php?rubrique18", "kind": "officiel", "note": ex["source"]})

        # ---- question / énoncé
        part = s["part"]
        question = s.get("question") or (seg or {}).get("question", "")
        subq = s.get("sub_questions") or (seg or {}).get("questions", [])
        seg_text = ""
        text_path = (RAW / "sujetdebac" / slug_session / "sujet.txt") if not ex else (ROOT / ex["text_path"])
        full_text = text_path.read_text() if text_path.exists() else ""
        if seg and full_text:
            offs = sorted(p["offset"] for p in sess["parts"])
            nxt = [o for o in offs if o > seg["offset"]]
            seg_text = full_text[seg["offset"]: nxt[0] if nxt else len(full_text)]
        docs = document_listing(seg_text) if part in ("DISS", "EC3") else []
        statement_lines = []
        if part == "EC2" and seg:
            statement_lines.append(f"**Document :** {seg.get('document_title') or 'voir le sujet officiel'}")
            src = SRC_RE.search(seg_text)
            if src:
                statement_lines.append(f"\n*Source indiquée : {norm_text(src.group(1))}*")
        if docs:
            statement_lines.append(f"**Dossier documentaire ({len(docs)} documents)**\n")
            for d in docs:
                label = f"- Document {d['n']}"
                if d["title"]:
                    label += f" — {d['title']}"
                if d["source"]:
                    label += f" *(source : {d['source']})*"
                statement_lines.append(label)
        statement_note = ("Les documents ne sont pas reproduits ici (droits des auteurs des documents) : "
                          "consultez-les dans le sujet officiel, lien dans « Sources ».") if part != "EC1" else None

        # ---- contexte (autres parties de l'épreuve)
        siblings = []
        for p in sess.get("parts", []):
            if p["id"] == sid or p["id"] in s.get("also_appears_as", []):
                continue
            if (p.get("variant") or None) != (s.get("variant") or None) and part != "DISS" and p["part"] != "DISS":
                continue
            label = {"DISS": "Dissertation", "EC1": "EC1", "EC2": "EC2", "EC3": "EC3"}[p["part"]]
            if p.get("subq"):
                label += f" (question {p['subq']})"
            if p.get("variant") and part == "DISS":
                label += f" — sujet {p['variant']}"
            siblings.append({"part": label, "question": p["question"][:220]})

        # ---- grille / corrigé officiel
        corr = dict(rec_sdb.get("files", {}).get("corrige", {}))
        if corr.get("accessible") and not is_official_corrige((RAW / "sujetdebac" / slug_session / "corrige.txt").read_text()):
            # sujetdebac.fr étiquette parfois « corrigé officiel » un corrigé personnel d'enseignant : on le déclasse.
            unofficial_corrige_sessions.add(slug_session)
            corr["accessible"] = False
        grid_file = EDITORIAL / "grids" / f"{sid}.json"
        grid_ed = read_json(grid_file) if grid_file.exists() else None
        if corr.get("accessible"):
            ctext = (RAW / "sujetdebac" / slug_session / "corrige.txt").read_text()
            probe = question if part != "EC2" else (subq[-1]["text"] if subq else question)
            score, excerpt = locate_in_corrige(probe, ctext)
            (excerpts_dir / f"{sid}.txt").write_text(f"# score de localisation : {score}\n# {corr['url']}\n\n{excerpt}")
            ref = next((c for c in corr.get("codes", []) if c), None) or (f"{code}C" if exam_code_official else None)
            if grid_ed and grid_ed.get("match_verified"):
                status = "correspondance_verifiee"
                notes = (f"Document de correction de la session {code}. Correspondance vérifiée manuellement : "
                         + grid_ed.get("match_notes", "même session, même question, mêmes documents."))
            else:
                status = "correspondance_non_verifiee"
                notes = (f"Un document de correction existe pour la session {code} ; la section correspondant à cette question "
                         f"a été localisée automatiquement (concordance du libellé : {score}) mais pas encore vérifiée à la main.")
            notes += " Ce document officiel est relayé par sujetdebac.fr (site non institutionnel)."
            grid = {"isOfficial": True, "reference": ref, "url": corr["url"], "matchStatus": status, "matchNotes": notes,
                    "criteria": (grid_ed or {}).get("criteria", [])}
        else:
            grid = {"isOfficial": False, "reference": None, "url": None, "matchStatus": "grille_non_retrouvee",
                    "matchNotes": "Grille officielle non retrouvée : aucun document de correction officiel spécifique à ce sujet n'a été localisé "
                                  "(sources consultées : sujetdebac.fr, catalogue de l'académie de Versailles)."
                                  + (" Les éléments ci-dessous constituent une grille pédagogique éditoriale, PAS un barème officiel." if grid_ed else ""),
                    "criteria": (grid_ed or {}).get("criteria", [])}
            if grid_ed and grid_ed.get("official_url"):
                grid.update(isOfficial=True, url=grid_ed["official_url"], reference=grid_ed.get("reference"),
                            matchStatus=grid_ed.get("match_status", "correspondance_non_verifiee"), matchNotes=grid_ed.get("match_notes", ""))

        # ---- corrigé
        ans_file = EDITORIAL / "answers" / f"{sid}.md"
        answer = parse_answer(ans_file) if ans_file.exists() else None
        has_answer = answer is not None
        ped_status = answer["validationStatus"] if answer else ("sources_trouvees" if grid["matchStatus"] == "correspondance_verifiee" else "a_rechercher")

        tier = "free" if sid in access.get("free", []) else access.get("default", "premium")
        slug = sid.lower()
        rel = []
        for r in relations:
            if sid in (r["a"], r["b"]):
                other = r["b"] if r["a"] == sid else r["a"]
                rel.append({"id": other, "similarity": r["similarity"], "justification": r["justification"], "answerReuse": r["answer_reuse"]})

        summary = {
            "id": sid, "slug": slug, "chapterId": "croissance", "exerciseType": PART_TYPE[part], "variant": s.get("variant"),
            "examCode": code or "—", "year": meta["year"], "session": meta["session"], "day": meta["day"], "center": meta["center"],
            "question": question if part != "EC2" else (subq[-1]["text"] if subq else question),
            "subQuestions": [{"n": q["n"], "text": q["text"], "points": q.get("points")} for q in subq] if part == "EC2" else [],
            "points": s.get("points"), "instructionVerb": s.get("instruction_verb"), "notions": s.get("notions", []),
            "accessTier": tier, "verificationStatus": s.get("verification_status", "a_verifier"),
            "pedagogicalStatus": ped_status, "hasAnswer": has_answer, "gridStatus": grid["matchStatus"],
        }
        notes = []
        if not exam_code_official:
            notes.append("Code officiel non imprimé sur le sujet : identifiant interne.")
        if ov.get("note"):
            notes.append(ov["note"])
        if s.get("question_source"):
            notes.append(s["question_source"])
        if s.get("format_note"):
            notes.append(s["format_note"] + ".")
        if s.get("also_appears_as"):
            notes.append("Exercice reproduit à l'identique (question et dossier) dans le sujet B de la même épreuve "
                         f"({', '.join(s['also_appears_as'])}) : un seul exercice, recensé une fois.")
        for d in s.get("versailles_doc_ids", []):
            e = catalog.get(d)
            if e and e["lieu"] and e["lieu"] != meta["center"] and not meta["center"].startswith(e["lieu"]):
                notes.append(f"Incohérence relevée : le catalogue de Versailles (doc. {d}) indique « {e['lieu']} », "
                             f"alors que le fichier ({e['file_name']}) et le sujet officiel correspondent à {meta['center']}.")
        detail = {
            **summary,
            "question": question,
            "statementMd": "\n".join(statement_lines) or None,
            "statementNote": statement_note,
            "siblingParts": siblings,
            "sources": sources,
            "verificationNotes": " ".join(notes) or None,
            "grid": grid,
            "related": rel,
            "externalCorrections": s.get("external_corrections", []),
        }
        details.append(detail)
        summaries.append(summary)
        if answer:
            write_json(PUBLISHED / "answers" / f"{sid}.json", {
                "subjectId": sid, "version": answer.get("version", 1), "contentMd": answer["contentMd"],
                "checklist": answer.get("checklist", []),
                "sources": resolve_sources(answer.get("sources", []), corr.get("url") if corr.get("accessible") else None, code, externals),
                "validationStatus": answer["validationStatus"], "validatedByHuman": answer.get("validatedByHuman", False),
                "lastRevisedAt": answer["lastRevisedAt"], "limits": answer.get("limits"),
            })
        inventory.append({
            "id": sid, "annee": meta["year"], "session": meta["session"], "jour": meta["day"] or "", "centre": meta["center"],
            "code_officiel": code if exam_code_official else "", "type": PART_TYPE[part], "variante": s.get("variant") or "",
            "points": s.get("points") or "", "intitule": summary["question"],
            "sous_questions": " | ".join(q["text"] for q in summary["subQuestions"]),
            "url_source_officielle": next((x["url"] for x in sources if x["kind"] == "officiel"), ""),
            "url_document_original": next((x["url"] for x in sources if x["kind"] == "tiers-relai-officiel"), "")
            or next((x["url"] for x in sources if x["kind"] == "archive"), ""),
            "docs_versailles": ";".join(map(str, s.get("versailles_doc_ids", []))),
            "grille_reference": grid["reference"] or "", "grille_url": grid["url"] or "", "grille_statut": grid["matchStatus"],
            "statut_verification_sujet": summary["verificationStatus"],
            "statut_recherche_corrige": "sources_trouvees" if (grid["isOfficial"] or s.get("external_corrections")) else "a_rechercher",
            "statut_validation_pedagogique": ped_status, "acces": tier,
        })

    # relations : compléter les infos d'affichage
    by_id = {d["id"]: d for d in details}
    for d in details:
        for r in d["related"]:
            o = by_id.get(r["id"])
            if o:
                r.update(slug=o["slug"], question=o["question"], exerciseType=o["exerciseType"], year=o["year"], center=o["center"])
        d["related"] = [r for r in d["related"] if "slug" in r]
        write_json(PUBLISHED / "subjects" / f"{d['slug']}.json", d)

    write_json(PUBLISHED / "subjects.json", summaries)
    chapters = [{"id": c[0], "number": c[1], "title": c[2], "shortTitle": c[3], "field": c[4], "status": c[5], "summary": c[6],
                 "subjectCount": sum(1 for s in summaries if s["chapterId"] == c[0])} for c in CHAPTERS]
    write_json(PUBLISHED / "chapters.json", chapters)

    by_type = {t: sum(1 for s in summaries if s["exerciseType"] == t) for t in ("EC1", "EC2", "EC3", "dissertation")}
    meta = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "inventory": {
            "totalQuestions": len(summaries), "byType": by_type,
            "withAnswer": sum(s["hasAnswer"] for s in summaries),
            "withOfficialGrid": sum(s["gridStatus"] == "correspondance_verifiee" for s in summaries),
            "toVerify": sum(s["verificationStatus"] == "a_verifier" for s in summaries),
        },
        "toVerify": ed.get("to_verify", []), "outOfScope": ed.get("out_of_scope", []),
        "excludedCandidates": ed.get("excluded_candidates", []),
    }
    meta["unofficialCorrigesMislabelled"] = sorted(unofficial_corrige_sessions)
    write_json(PUBLISHED / "meta.json", meta)
    inventory.sort(key=lambda r: (r["annee"], r["code_officiel"] or r["id"], r["type"]))
    write_json(PUBLISHED / "inventory.json", inventory)
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=list(inventory[0].keys()), delimiter=";")
    w.writeheader()
    w.writerows(inventory)
    (PUBLISHED / "inventory.csv").write_text("﻿" + buf.getvalue())
    print(f"{len(summaries)} sujets publiés · {meta['inventory']} · {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
