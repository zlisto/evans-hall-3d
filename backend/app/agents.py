"""One PydanticAI agent per professor. The prompt is built from the DB plus an optional style file."""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache

from openai import AsyncOpenAI
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIResponsesModel
from pydantic_ai.providers.openai import OpenAIProvider

from . import db
from .config import MODEL_NAME, PORTKEY_BASE_URL, PROFILES, PROMPTS, STYLES
from .tools import ALL_TOOLS


@dataclass
class Style:
    text: str
    greeting: str
    custom: bool


def load_style(slug: str) -> Style:
    """styles/<slug>.md may start with 'greeting: ...' and a '---' line; the rest is the style."""
    path = STYLES / f"{slug}.md"
    custom = path.is_file()
    raw = (path if custom else STYLES / "default.md").read_text(encoding="utf-8")
    greeting = ""
    if raw.startswith("greeting:"):
        head, _, raw = raw.partition("\n---\n")
        greeting = head.removeprefix("greeting:").strip()
    return Style(raw.strip(), greeting, custom)


def format_courses(rows: list[dict]) -> str:
    """Group sections by course so the prompt lists each description once."""
    if not rows:
        return "(No sections listed for you in the Fall 2026 catalog.)"
    out, seen = [], {}
    for r in rows:
        key = (r["course_number"], r["course_title"])
        when = r["daytimes"].replace("  ", " ") or "time TBA"
        where = r["room"].title() if r["room"] else "room TBA"
        line = f"  - Section {r['section']}: {when}, {where}, session {r['course_session']}"
        if key in seen:
            seen[key].append(line)
            continue
        seen[key] = block = [line]
        out.append((key, r, block))
    parts = []
    for (num, title), r, lines in out:
        parts.append(
            f"**{num}: {title}** ({r['course_category']}, {r['units']} units)\n"
            + "\n".join(lines)
            + f"\n  Description: {r['course_description'].strip() or 'n/a'}"
            + (f"\n  Syllabus: {r['syllabus']}" if r["syllabus"] else "")
        )
    return "\n\n".join(parts)


def load_background(slug: str) -> str:
    """profiles/<slug>.md: researched facts about the professor's work (optional)."""
    path = PROFILES / f"{slug}.md"
    if path.is_file():
        return path.read_text(encoding="utf-8").strip()
    return "(Nothing beyond the catalog. If asked about your research, stick to your bio and don't invent papers.)"


def build_prompt(faculty: str, slug: str) -> str:
    template = (PROMPTS / "professor.md").read_text(encoding="utf-8")
    return (
        template.replace("{{NAME}}", db.display_name(faculty))
        .replace("{{BIO}}", db.bio_for(faculty) or "(No bio in the catalog.)")
        .replace("{{COURSES}}", format_courses(db.courses_for(faculty)))
        .replace("{{BACKGROUND}}", load_background(slug))
        .replace("{{STYLE}}", load_style(slug).text)
    )


@lru_cache
def model() -> OpenAIResponsesModel:
    key = os.getenv("PORTKEY_API_KEY")
    if not key:
        raise RuntimeError("PORTKEY_API_KEY is missing. Put it in a .env file in backend/ or a folder above it.")
    headers = {"x-portkey-api-key": key}
    if virtual_key := os.getenv("PORTKEY_VIRTUAL_KEY"):
        headers["x-portkey-virtual-key"] = virtual_key
    else:
        headers["x-portkey-provider"] = "openai"
    client = AsyncOpenAI(api_key=key, base_url=PORTKEY_BASE_URL, default_headers=headers)
    return OpenAIResponsesModel(MODEL_NAME, provider=OpenAIProvider(openai_client=client))


@lru_cache(maxsize=256)
def agent_for(slug: str) -> Agent:
    faculty = db.professors()[slug]
    return Agent(model(), instructions=build_prompt(faculty, slug), tools=ALL_TOOLS, name=slug)
