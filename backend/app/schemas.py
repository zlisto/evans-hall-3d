from __future__ import annotations

from pydantic import BaseModel, Field


class ProfessorSummary(BaseModel):
    slug: str
    name: str
    courses: list[str]
    custom_style: bool


class ProfessorProfile(ProfessorSummary):
    greeting: str
    rooms: list[str]


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    session_id: str | None = Field(default=None, max_length=64)


class ChatReply(BaseModel):
    reply: str
    session_id: str
    tools_used: list[str]
