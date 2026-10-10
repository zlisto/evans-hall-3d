"""Settings: paths, model name, and the Portkey key, all from the environment."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

os.environ.setdefault("PYDANTIC_AI_NO_BANNER", "1")  # quiet startup

BACKEND = Path(__file__).resolve().parent.parent
REPO = BACKEND.parent

# .env can sit in backend/ or any folder above it (e.g. the class-folder root). Closest wins.
for folder in [BACKEND, *BACKEND.parents]:
    if (folder / ".env").is_file():
        load_dotenv(folder / ".env")
        break

DB_PATH = Path(os.getenv("SOM_DB_PATH") or REPO / "data" / "yale_som.db")
PROMPTS = BACKEND / "app" / "prompts"
STYLES = BACKEND / "app" / "styles"
PROFILES = BACKEND / "app" / "profiles"  # researched background per professor (optional)

MODEL_NAME = os.getenv("OPENAI_MODEL") or "gpt-6-luna"
PORTKEY_BASE_URL = "https://api.portkey.ai/v1"

# browsers allowed to call the API directly (Vite's dev proxy doesn't need this)
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip()]
