"""Anonymous visitor sessions: no login, just an HMAC-signed bearer token carrying a random session id.

Spend limits are tracked per session (see spend.py). Starting new sessions is rate-limited per IP so a
visitor can't mint endless fresh allowances, and spend.py also enforces a daily cap across everyone.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import os
import secrets
import time
from collections import defaultdict, deque
from dataclasses import dataclass

from fastapi import Header, HTTPException

from . import config  # noqa: F401  (loads .env so AUTH_SECRET is set before we read it)

TOKEN_TTL = 7 * 24 * 3600  # a session lasts a week in the same browser
MAX_NEW, NEW_WINDOW = 20, 3600  # per IP: 20 new sessions per hour

_secret = os.getenv("AUTH_SECRET")
SECRET = (_secret or secrets.token_hex(32)).encode()  # random secret: sessions reset when the server restarts


def status() -> str:
    return "visitor sessions" + ("" if _secret else " (no AUTH_SECRET: sessions reset on restart)")


@dataclass
class User:
    session_id: str
    email: str = "visitor"  # kept for the chat history key and spend records


def _b64(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def _unb64(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def _sign(payload: str) -> str:
    return _b64(hmac.new(SECRET, payload.encode(), hashlib.sha256).digest())


_new: dict[str, deque] = defaultdict(deque)


def new_session(ip: str) -> str:
    """Issue a token for a fresh visitor session, or 429 if this IP is starting too many."""
    now = time.time()
    recent = _new[ip]
    while recent and now - recent[0] > NEW_WINDOW:
        recent.popleft()
    if len(recent) >= MAX_NEW:
        raise HTTPException(429, "Too many new sessions from this network. Try again later.")
    recent.append(now)
    payload = f"{secrets.token_hex(8)}|{int(now) + TOKEN_TTL}"
    return f"{_b64(payload.encode())}.{_sign(payload)}"


def current_user(authorization: str | None = Header(default=None)) -> User:
    """FastAPI dependency: the visitor's session, or 401 (the client then asks for a new one)."""
    try:
        token = (authorization or "").removeprefix("Bearer ").strip()
        body, sig = token.split(".")
        payload = _unb64(body).decode()
        session_id, exp = payload.split("|")
        ok = hmac.compare_digest(sig, _sign(payload)) and int(exp) > time.time()
    except (ValueError, UnicodeDecodeError):
        ok = False
    if not ok:
        raise HTTPException(401, "Session expired.")
    return User(session_id)
