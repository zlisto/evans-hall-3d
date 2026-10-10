"""FastAPI app: list professors and chat with any of them.

Run from backend/:  .venv/Scripts/python -m uvicorn app.main:app --port 8000
"""

from __future__ import annotations

import hashlib
import logging
import os
import uuid
from collections import OrderedDict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic_ai import UsageLimits
from pydantic_ai.messages import ModelMessage, ModelResponse, ToolCallPart

from . import db
from .agents import agent_for, load_style
from .config import CORS_ORIGINS, MODEL_NAME
from .schemas import ChatReply, ChatRequest, ProfessorProfile, ProfessorSummary

log = logging.getLogger("som")


def _key_fingerprint() -> str:
    """Length + short hash of the Portkey key, so deployments can be compared without showing the key."""
    key = os.getenv("PORTKEY_API_KEY") or ""
    if not key:
        return "MISSING"
    return f"{len(key)} chars, sha256 {hashlib.sha256(key.encode()).hexdigest()[:8]}"


print(f"[startup] model={MODEL_NAME} | PORTKEY_API_KEY: {_key_fingerprint()} | PORTKEY_VIRTUAL_KEY: {'set' if os.getenv('PORTKEY_VIRTUAL_KEY') else 'not set'}", flush=True)

app = FastAPI(title="Yale SOM Virtual: professor agents")
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["GET", "POST"], allow_headers=["*"])

MAX_TURNS = 10  # chat turns of history kept per conversation
MAX_SESSIONS = 500
# (slug, session_id) -> list of turns; each turn is that run's new messages (tool calls stay paired)
sessions: OrderedDict[tuple[str, str], list[list[ModelMessage]]] = OrderedDict()


def _faculty(slug: str) -> str:
    faculty = db.professors().get(slug)
    if not faculty:
        raise HTTPException(404, f"No professor '{slug}' in the catalog.")
    return faculty


def _summary(slug: str, faculty: str) -> dict:
    rows = db.courses_for(faculty)
    return {
        "slug": slug,
        "name": db.display_name(faculty),
        "courses": sorted({r["course_number"] for r in rows}),
        "custom_style": load_style(slug).custom,
    }


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "model": MODEL_NAME, "professors": len(db.professors())}


@app.get("/api/professors", response_model=list[ProfessorSummary])
def list_professors() -> list[dict]:
    return [_summary(slug, faculty) for slug, faculty in db.professors().items()]


@app.get("/api/professors/{slug}", response_model=ProfessorProfile)
def get_professor(slug: str) -> dict:
    faculty = _faculty(slug)
    style = load_style(slug)
    name = db.display_name(faculty)
    rooms = sorted({r["room"].title() for r in db.courses_for(faculty) if r["room"]})
    greeting = style.greeting or f"Hi, I'm Professor {name.split()[-1]}. Ask me about my classes, or anything stats and business."
    return {**_summary(slug, faculty), "greeting": greeting, "rooms": rooms}


@app.post("/api/professors/{slug}/chat", response_model=ChatReply)
async def chat(slug: str, req: ChatRequest) -> dict:
    _faculty(slug)
    sid = req.session_id or uuid.uuid4().hex
    key = (slug, sid)
    turns = sessions.pop(key, [])
    history = [m for turn in turns for m in turn]
    try:
        result = await agent_for(slug).run(req.message, message_history=history, usage_limits=UsageLimits(request_limit=8))
    except Exception as e:  # model/network trouble: tell the UI, keep the old history
        log.exception("chat failed for %s", slug)
        sessions[key] = turns
        raise HTTPException(502, f"The professor's AI brain hit an error: {type(e).__name__}") from e
    new = result.new_messages()
    sessions[key] = (turns + [new])[-MAX_TURNS:]
    while len(sessions) > MAX_SESSIONS:
        sessions.popitem(last=False)
    tools = [p.tool_name for m in new if isinstance(m, ModelResponse) for p in m.parts if isinstance(p, ToolCallPart)]
    return {"reply": result.output, "session_id": sid, "tools_used": tools}
