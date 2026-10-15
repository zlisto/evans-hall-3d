"""AI spend per visitor session (`chat_sessions`) and per day across everyone (`daily_spend`).
Chat stops at SPEND_LIMIT_USD for a session, or DAILY_LIMIT_USD for the whole site."""

from __future__ import annotations

import os
import sqlite3

from pydantic_ai.usage import RunUsage

from .config import MODEL_NAME, STATE_DB_PATH

# USD per 1M tokens: OpenAI Standard pricing (MGT 409 Lecture 11; same table as hw/hw6 prices.json)
PRICES = {
    "gpt-6-luna": {"input": 0.10, "cached_input": 0.01, "cache_write": 0.125, "output": 0.50},
}
LIMIT_USD = float(os.getenv("SPEND_LIMIT_USD") or 0.10)
LIMIT_MESSAGE = "Free Tier Limit Reached"
DAILY_LIMIT_USD = float(os.getenv("DAILY_LIMIT_USD") or 2.0)
DAILY_MESSAGE = "The professors are done for today. Come back tomorrow!"


def cost_of(usage: RunUsage, model: str = MODEL_NAME) -> float:
    """input_tokens already includes cache reads and writes, so those are split out and priced separately."""
    p = PRICES.get(model)
    if p is None:  # unknown model: price it like the most expensive known one so the limit still bites
        p = max(PRICES.values(), key=lambda q: q["output"])
    plain = usage.input_tokens - usage.cache_read_tokens - usage.cache_write_tokens
    return (
        plain * p["input"]
        + usage.cache_read_tokens * p["cached_input"]
        + usage.cache_write_tokens * p["cache_write"]
        + usage.output_tokens * p["output"]
    ) / 1_000_000


def _connect() -> sqlite3.Connection:
    return sqlite3.connect(STATE_DB_PATH)


def setup() -> None:
    with _connect() as con:
        con.execute(
            """CREATE TABLE IF NOT EXISTS chat_sessions (
                 session_id TEXT PRIMARY KEY,
                 email TEXT NOT NULL,
                 spent_usd REAL NOT NULL DEFAULT 0,
                 input_tokens INTEGER NOT NULL DEFAULT 0,
                 output_tokens INTEGER NOT NULL DEFAULT 0,
                 updated_at TEXT NOT NULL DEFAULT (datetime('now'))
               )"""
        )
        con.execute("CREATE TABLE IF NOT EXISTS daily_spend (day TEXT PRIMARY KEY, spent_usd REAL NOT NULL DEFAULT 0)")


def spent_today() -> float:
    with _connect() as con:
        row = con.execute("SELECT spent_usd FROM daily_spend WHERE day = date('now')").fetchone()
    return row[0] if row else 0.0


def spent(session_id: str) -> float:
    with _connect() as con:
        row = con.execute("SELECT spent_usd FROM chat_sessions WHERE session_id = ?", (session_id,)).fetchone()
    return row[0] if row else 0.0


def add(session_id: str, email: str, usage: RunUsage) -> float:
    """Record one reply's usage; returns the session's new total in USD."""
    with _connect() as con:
        con.execute(
            """INSERT INTO chat_sessions (session_id, email, spent_usd, input_tokens, output_tokens) VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(session_id) DO UPDATE SET
                 spent_usd = spent_usd + excluded.spent_usd,
                 input_tokens = input_tokens + excluded.input_tokens,
                 output_tokens = output_tokens + excluded.output_tokens,
                 updated_at = datetime('now')""",
            (session_id, email, cost_of(usage), usage.input_tokens, usage.output_tokens),
        )
        con.execute(
            """INSERT INTO daily_spend (day, spent_usd) VALUES (date('now'), ?)
               ON CONFLICT(day) DO UPDATE SET spent_usd = spent_usd + excluded.spent_usd""",
            (cost_of(usage),),
        )
    return spent(session_id)
