"""Save (insert or replace) one researched professor profile into data/yale_som.db.

Usage, from backend/:  .venv/Scripts/python scripts/save_profile.py path/to/profile.json

profile.json fields:
  slug, name          e.g. "mushfiq-mobarak", "Mushfiq Mobarak"
  greeting            first chat message
  speaking_style      markdown: how they talk (only traits backed by sources)
  background          markdown: research, news, career facts (only from sources)
  appearance          object for the 3D avatar (see src/PersonAvatar.jsx)
  sources             list of URLs the facts came from
"""

from __future__ import annotations

import json
import sqlite3
import sys
from datetime import date
from pathlib import Path

DB = Path(__file__).resolve().parents[2] / "data" / "yale_som.db"

SCHEMA = """CREATE TABLE IF NOT EXISTS professor_profiles (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  greeting TEXT NOT NULL DEFAULT '',
  speaking_style TEXT NOT NULL DEFAULT '',
  background TEXT NOT NULL DEFAULT '',
  appearance TEXT NOT NULL DEFAULT '{}',
  sources TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL
)"""


def main(path: str) -> None:
    p = json.loads(Path(path).read_text(encoding="utf-8"))
    with sqlite3.connect(DB) as con:
        con.execute(SCHEMA)
        con.execute(
            "INSERT OR REPLACE INTO professor_profiles VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                p["slug"],
                p["name"],
                p.get("greeting", ""),
                p.get("speaking_style", ""),
                p.get("background", ""),
                json.dumps(p.get("appearance", {})),
                json.dumps(p.get("sources", [])),
                date.today().isoformat(),
            ),
        )
    print(f"saved {p['slug']} to {DB.name}")


if __name__ == "__main__":
    main(sys.argv[1])
