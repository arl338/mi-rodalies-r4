#!/usr/bin/env python3
"""Detect changes to verified PDF sources without importing unverified times."""
import hashlib
import json
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1] / "data/reference"
REFERENCES = {
    "r1_official_timetable.json": "pdf_sha256",
    "r2_official_timetable.json": "document_sha256",
    "r4_official_timetable.json": "sha256",
    "rl3_official_timetable.json": "pdf_sha256",
    "additional_official_timetables.json": None,
    "official_regional_verified.json": None,
}

def main():
    sources = {}
    for filename, field in REFERENCES.items():
        doc = json.loads((ROOT / filename).read_text(encoding="utf8"))
        urls = [doc["source"]] if field else doc["sources"].values()
        for url in urls:
            expected = doc[field] if field else None
            if url not in sources or expected:
                sources[url] = expected
    issues = []
    for url, expected in sorted(sources.items()):
        try:
            parsed = urlparse(url)
            if parsed.scheme != "https" or parsed.hostname != "rodalies.gencat.cat":
                raise ValueError("Unexpected source host")
            req = urllib.request.Request(url, headers={"User-Agent": "MiRodalies PDF audit"})
            with urllib.request.urlopen(req, timeout=30) as response:
                if urlparse(response.geturl()).hostname != "rodalies.gencat.cat":
                    raise ValueError("Unexpected redirect host")
                raw = response.read(15_000_001)
            if len(raw) > 15_000_000 or not raw.startswith(b"%PDF"):
                raise ValueError("Invalid or oversized PDF")
            actual = hashlib.sha256(raw).hexdigest()
            status = "UNCHANGED" if actual == expected else "CHANGED" if expected else "NO_VERIFIED_BASELINE"
            print(status, url, actual, flush=True)
            if status != "UNCHANGED":
                issues.append((status, url))
        except (OSError, ValueError) as exc:
            print("UNAVAILABLE", url, str(exc), flush=True)
            issues.append(("UNAVAILABLE", url))
    if issues:
        raise SystemExit("PDF review required: " + str(len(issues)) + " sources")

if __name__ == "__main__":
    main()
