"""Course-catalog tools every professor agent can call. Each returns plain dicts from the DB."""

from __future__ import annotations

from . import db


def search_courses(query: str, limit: int = 10) -> list[dict] | str:
    """Search the Yale SOM Fall 2026 course catalog by topic or keywords.

    Matches course number, title, category, description, and instructor. Use it for questions
    like "is there a class on negotiation?" or "what finance electives are there?".

    Args:
        query: a few keywords, e.g. "machine learning", "real estate", "negotiation".
        limit: max sections to return (default 10).
    """
    rows = db.search(query, min(max(limit, 1), 25))
    return rows or f"No courses matched '{query}'. Try fewer or broader keywords."


def get_course(course_number: str) -> list[dict] | str:
    """Get full details (description, sections, times, rooms, instructor, syllabus link) for one course.

    Args:
        course_number: like "MGT 409" or "MGMT 7206".
    """
    rows = db.by_number(course_number)
    return rows or f"No course numbered '{course_number}' in the Fall 2026 catalog."


def courses_by_professor(name: str) -> dict | str:
    """List what a faculty member teaches this fall, with their bio.

    Args:
        name: any part of the name, e.g. "Sudhir", "Bryan Kelly".
    """
    rows = db.by_faculty(name)
    if not rows:
        return f"No instructor matching '{name}' in the Fall 2026 catalog."
    bio = next((r["faculty_bio"] for r in rows if r["faculty_bio"]), "")
    return {"bio": bio, "sections": [{k: v for k, v in r.items() if k != "faculty_bio"} for r in rows]}


def courses_by_schedule(day: str = "", room: str = "", session: str = "") -> list[dict] | str:
    """Find classes by meeting day, room, and/or half-semester. Leave a filter empty to skip it.

    Args:
        day: a weekday name, e.g. "Monday", "Thursday".
        room: a room like "Evans 2200" or just "2200".
        session: "fall" (full semester), "fall-1" (first half), or "fall-2" (second half).
    """
    if not (day or room or session):
        return "Give at least one of day, room, or session."
    rows = db.by_schedule(day, room, session)
    return rows or "No classes match that day/room/session."


ALL_TOOLS = [search_courses, get_course, courses_by_professor, courses_by_schedule]
