"""Outils partagés par le pipeline documentaire.

Le pipeline sépare trois couches de données :
  data/raw/        -> données brutes collectées (régénérables par les scripts)
  data/editorial/  -> contenus éditoriaux rédigés/validés à la main (jamais écrasés)
  data/published/  -> fusion des deux, consommée par le site (régénérée par build.py)
"""
from __future__ import annotations

import hashlib
import json
import os
import subprocess
import time
import unicodedata
import re
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
EDITORIAL = ROOT / "data" / "editorial"
PUBLISHED = ROOT / "data" / "published"
CACHE = RAW / "cache"

OFFICIAL_HOST = "https://ses.ac-versailles.fr/"
USER_AGENT = "bac-ses-revision-research/0.1 (collecte documentaire pedagogique; respect robots)"


def slugify(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    value = re.sub(r"[^a-zA-Z0-9]+", "-", value).strip("-").lower()
    return value


def norm_text(value: str) -> str:
    value = value.replace(" ", " ").replace(" ", " ").replace("’", "'")
    return re.sub(r"\s+", " ", value).strip()


def _curl(url: str, dest: Path, timeout: int = 60) -> int:
    """Télécharge via curl (respecte HTTPS_PROXY et le bundle CA du système)."""
    proc = subprocess.run(
        ["curl", "-sS", "-L", "-m", str(timeout), "-A", USER_AGENT, "-o", str(dest),
         "-w", "%{http_code}", url],
        capture_output=True, text=True,
    )
    try:
        return int(proc.stdout.strip() or 0)
    except ValueError:
        return 0


def wayback_url(original: str, timestamp: str = "2026") -> str:
    # le suffixe id_ renvoie le fichier d'origine sans la barre d'outils de l'archive
    return f"https://web.archive.org/web/{timestamp}id_/{original}"


_HOST_UP: dict[str, bool] = {}


def official_host_reachable() -> bool:
    """Teste une seule fois par exécution si le site officiel répond (évite ~25 s d'attente par document)."""
    if "official" not in _HOST_UP:
        probe = CACHE / "_probe"
        _HOST_UP["official"] = _curl(OFFICIAL_HOST, probe, timeout=20) == 200
        probe.unlink(missing_ok=True)
        print("site officiel joignable :", _HOST_UP["official"])
    return _HOST_UP["official"]


def fetch(original_url: str, *, timestamp: str = "2026", allow_archive: bool = True) -> dict:
    """Récupère un document en cache, sinon sur le site officiel, sinon via la Wayback Machine.

    Renvoie un dict de provenance : {path, via, fetched_url, status}.
    Le résultat est mis en cache : relancer le script ne refait pas les requêtes.
    """
    CACHE.mkdir(parents=True, exist_ok=True)
    key = hashlib.sha1(original_url.encode()).hexdigest()[:16]
    meta_path = CACHE / f"{key}.json"
    if meta_path.exists():
        meta = json.loads(meta_path.read_text())
        if meta.get("status") == 200 and Path(meta["path"]).exists():
            return meta
    dest = CACHE / f"{key}.bin"
    attempts = []
    if not original_url.startswith(OFFICIAL_HOST) or official_host_reachable():
        attempts.append(("officiel", original_url))
    if allow_archive:
        attempts.append(("wayback", wayback_url(original_url, timestamp)))
    meta = {"original_url": original_url, "status": 0, "via": None, "fetched_url": None, "path": str(dest), "attempts": []}
    for via, url in attempts:
        for retry in range(2):
            status = _curl(url, dest)
            meta["attempts"].append({"via": via, "url": url, "status": status})
            if status == 200 and dest.exists() and dest.stat().st_size > 0:
                meta.update(status=200, via=via, fetched_url=url, fetched_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
                meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=1))
                return meta
            time.sleep(1.5 * (retry + 1))
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=1))
    return meta


def write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def read_json(path: Path, default=None):
    if not path.exists():
        return default
    return json.loads(path.read_text())
