"""Read-only access to data/yale_som.db (one `courses` table, one row per section)."""

from __future__ import annotations

import json
import re
import sqlite3
from functools import lru_cache

from .config import DB_PATH

BRIEF = "course_number, course_title, course_category, faculty_1, daytimes, room, course_session, section, units"
FULL = BRIEF + ", course_type, course_description, syllabus, old_syllabus"


def _query(sql: str, params: tuple = ()) -> list[dict]:
    con = sqlite3.connect(f"file:{DB_PATH.as_posix()}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    try:
        return [dict(r) for r in con.execute(sql, params)]
    finally:
        con.close()


def display_name(faculty: str) -> str:
    """'Zaman, Tauhid' -> 'Tauhid Zaman'."""
    last, _, first = faculty.partition(",")
    return f"{first.strip()} {last.strip()}".strip()


def slugify(faculty: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", display_name(faculty).lower()).strip("-")


@lru_cache
def professors() -> dict[str, str]:
    """slug -> faculty name as stored in the DB ('Last, First')."""
    rows = _query("SELECT DISTINCT faculty_1 FROM courses WHERE faculty_1 <> '' ORDER BY faculty_1")
    return {slugify(r["faculty_1"]): r["faculty_1"] for r in rows}


def courses_for(faculty: str) -> list[dict]:
    return _query(f"SELECT {FULL} FROM courses WHERE faculty_1 = ? ORDER BY course_number, section", (faculty,))


def bio_for(faculty: str) -> str:
    rows = _query("SELECT faculty_bio FROM courses WHERE faculty_1 = ? AND faculty_bio <> '' LIMIT 1", (faculty,))
    return rows[0]["faculty_bio"] if rows else ""


STOPWORDS = {"a", "an", "and", "the", "of", "on", "in", "for", "to", "class", "classes", "course", "courses", "about", "any", "is", "there"}
ALIASES = {"ai": r"\bai\b|artificial intelligence|machine learning|\bllms?\b|generative"}
FIELD_WEIGHTS = {"course_title": 4, "course_category": 2, "faculty_1": 3, "course_number": 3, "course_description": 1}


def search(query: str, limit: int = 10) -> list[dict]:
    """Rank sections by whole-word keyword hits (title counts most). Every keyword must hit somewhere."""
    words = [w for w in re.findall(r"[\w&]+", query.lower()) if w not in STOPWORDS][:6]
    if not words:
        return []
    # match at word starts so 'ai' skips 'maintain' but 'regress' still finds 'regression'
    patterns = [re.compile(ALIASES.get(w, rf"\b{re.escape(w)}"), re.I) for w in words]
    scored = []
    for r in _query(f"SELECT {BRIEF}, course_description FROM courses"):
        score = 0
        for p in patterns:
            hit = sum(wt for f, wt in FIELD_WEIGHTS.items() if p.search(r[f] or ""))
            if not hit:
                break
            score += hit
        else:
            r["blurb"] = r.pop("course_description")[:220]
            scored.append((score, r))
    scored.sort(key=lambda sr: (-sr[0], sr[1]["course_number"], sr[1]["section"]))
    seen, out = set(), []  # one row per course; get_course has every section
    for _, r in scored:
        if r["course_number"] not in seen:
            seen.add(r["course_number"])
            out.append(r)
    return out[:limit]


def by_number(course_number: str) -> list[dict]:
    num = re.sub(r"\s+", " ", course_number.strip().upper())
    return _query(f"SELECT {FULL} FROM courses WHERE upper(course_number) = ? ORDER BY section", (num,))


def by_faculty(name: str) -> list[dict]:
    """Match any part of the name ('Zaman', 'Tauhid', 'Tauhid Zaman')."""
    words = re.findall(r"\w+", name.lower())
    if not words:
        return []
    where = " AND ".join("lower(faculty_1) LIKE ?" for _ in words)
    return _query(f"SELECT {BRIEF}, faculty_bio FROM courses WHERE {where} ORDER BY course_number, section", tuple(f"%{w}%" for w in words))


DAY_TOKENS = {"mo": "M", "tu": "T", "we": "W", "th": "Th", "fr": "F", "sa": "Sa", "su": "Su"}


def meets_on(daytimes: str, day: str) -> bool:
    """daytimes look like 'M  W 10:05 AM-11:25 AM' or 'T  Th 1:00 PM-2:20 PM'; day is a name like 'Thursday'."""
    want = DAY_TOKENS.get(day.strip().lower()[:2])
    days = re.split(r"\d", daytimes, maxsplit=1)[0].split()
    return want in days


def by_schedule(day: str = "", room: str = "", session: str = "", limit: int = 25) -> list[dict]:
    clauses, params = [], []
    if room:
        digits = re.sub(r"\D", "", room)
        clauses.append("room LIKE ?")
        params.append(f"%{digits or room}%")
    if session:
        clauses.append("course_session = ?")
        params.append(session.lower())
    where = " AND ".join(clauses) or "1"
    rows = _query(f"SELECT {BRIEF} FROM courses WHERE {where} ORDER BY daytimes, room", tuple(params))
    if day:
        rows = [r for r in rows if meets_on(r["daytimes"], day)]
    return rows[:limit]


def profile(slug: str) -> dict | None:
    """Researched profile (professor_profiles table, written by scripts/save_profile.py), if any."""
    try:
        rows = _query("SELECT * FROM professor_profiles WHERE slug = ?", (slug,))
    except sqlite3.OperationalError:  # table not created yet
        return None
    return rows[0] if rows else None


def appearances() -> dict[str, dict]:
    """slug -> avatar appearance for every profile that has one."""
    try:
        rows = _query("SELECT slug, appearance FROM professor_profiles")
    except sqlite3.OperationalError:
        return {}
    out = {}
    for r in rows:
        look = json.loads(r["appearance"] or "{}")
        if look:
            out[r["slug"]] = look
    return out
