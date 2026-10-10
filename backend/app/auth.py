"""Login: a `users` table in backend/state.db (local, not in the repo), scrypt password hashes, HMAC-signed bearer tokens.

The login comes from env vars AUTH_EMAIL / AUTH_PASSWORD, hashed into the table at startup.
No AUTH_EMAIL means no users, so nobody can chat (fails closed).
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import os
import secrets
import sqlite3
import time
from collections import defaultdict, deque
from dataclasses import dataclass

from fastapi import Header, HTTPException

from .config import STATE_DB_PATH

SCRYPT = {"n": 2**14, "r": 8, "p": 1}
TOKEN_TTL = 7 * 24 * 3600  # a login lasts a week
MAX_FAILS, FAIL_WINDOW = 10, 600  # per IP: 10 wrong passwords per 10 minutes

_secret = os.getenv("AUTH_SECRET")
SECRET = (_secret or secrets.token_hex(32)).encode()  # random secret: logins reset when the server restarts


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, dklen=32, **SCRYPT)
    return f"scrypt${SCRYPT['n']}${SCRYPT['r']}${SCRYPT['p']}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, n, r, p, salt, digest = stored.split("$")
        got = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=int(n), r=int(r), p=int(p), dklen=len(digest) // 2)
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(got.hex(), digest)


DUMMY_HASH = hash_password(secrets.token_hex(8))  # unknown emails still pay for one hash, so timing doesn't leak who exists


def _connect() -> sqlite3.Connection:
    return sqlite3.connect(STATE_DB_PATH)


def setup_users() -> str:
    """Create the users table and upsert the AUTH_EMAIL login. Returns a startup status line."""
    email = (os.getenv("AUTH_EMAIL") or "").strip().lower()
    password = os.getenv("AUTH_PASSWORD") or ""
    with _connect() as con:
        con.execute(
            """CREATE TABLE IF NOT EXISTS users (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                 password_hash TEXT NOT NULL,
                 created_at TEXT NOT NULL DEFAULT (datetime('now'))
               )"""
        )
        if not (email and password):
            return "login: AUTH_EMAIL/AUTH_PASSWORD not set, so nobody can chat"
        row = con.execute("SELECT password_hash FROM users WHERE email = ?", (email,)).fetchone()
        if row is None:
            con.execute("INSERT INTO users (email, password_hash) VALUES (?, ?)", (email, hash_password(password)))
        elif not verify_password(password, row[0]):  # password changed in the env: re-hash (old logins stop working)
            con.execute("UPDATE users SET password_hash = ? WHERE email = ?", (hash_password(password), email))
    note = "" if _secret else " (no AUTH_SECRET: logins reset on restart)"
    return f"login: {email} ready{note}"


def _password_hash(email: str) -> str | None:
    with _connect() as con:
        row = con.execute("SELECT password_hash FROM users WHERE email = ?", (email,)).fetchone()
    return row[0] if row else None


_fails: dict[str, deque] = defaultdict(deque)


def check_login(email: str, password: str, ip: str) -> str:
    """Verify credentials and return a signed token, or raise 401/429."""
    now = time.time()
    fails = _fails[ip]
    while fails and now - fails[0] > FAIL_WINDOW:
        fails.popleft()
    if len(fails) >= MAX_FAILS:
        raise HTTPException(429, "Too many wrong passwords. Try again in a few minutes.")
    email = email.strip().lower()
    stored = _password_hash(email)
    if not verify_password(password, stored or DUMMY_HASH) or stored is None:
        fails.append(now)
        raise HTTPException(401, "Wrong email or password.")
    return make_token(email, stored)


def _b64(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def _unb64(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def _sign(payload: str) -> str:
    return _b64(hmac.new(SECRET, payload.encode(), hashlib.sha256).digest())


@dataclass
class User:
    email: str
    session_id: str  # one per login; spend limits are tracked per session


def make_token(email: str, password_hash: str) -> str:
    # the token carries a sliver of the password hash, so changing the password logs everyone out
    payload = f"{email}|{int(time.time()) + TOKEN_TTL}|{password_hash[-12:]}|{secrets.token_hex(8)}"
    return f"{_b64(payload.encode())}.{_sign(payload)}"


def current_user(authorization: str | None = Header(default=None)) -> User:
    """FastAPI dependency: the logged-in user and their login session, or 401."""
    try:
        token = (authorization or "").removeprefix("Bearer ").strip()
        body, sig = token.split(".")
        payload = _unb64(body).decode()
        email, exp, pw_tag, session_id = payload.split("|")
        stored = _password_hash(email)
        ok = hmac.compare_digest(sig, _sign(payload)) and int(exp) > time.time() and stored is not None and stored.endswith(pw_tag)
    except (ValueError, UnicodeDecodeError):
        ok = False
    if not ok:
        raise HTTPException(401, "Please log in to chat.")
    return User(email, session_id)
