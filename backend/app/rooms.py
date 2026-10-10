"""Virtual Evans Hall room assignments (data/room_assignments.json, shared with the frontend)."""

from __future__ import annotations

import json
from functools import lru_cache

from .config import REPO


@lru_cache
def assignments() -> list[dict]:
    path = REPO / "data" / "room_assignments.json"
    return json.loads(path.read_text(encoding="utf-8"))["rooms"] if path.is_file() else []


def describe(a: dict) -> str:
    times = list(dict.fromkeys(s["time"] for s in a["sections"]))  # section order, no repeats
    moved = f" (the catalog lists {a['catalog_room']})" if a["catalog_room"] and a["catalog_room"] != f"Evans {a['room']}" else ""
    return f"Room {a['room']}, floor {a['floor']}{moved}: {a['course']} {a['title']} with Prof. {a['professor']}, {a['session']}, meets {', '.join(times)}"


def for_professor(slug: str) -> list[dict]:
    return [a for a in assignments() if a["slug"] == slug]
