# Professor agents backend

FastAPI + PydanticAI. Every faculty member in `../data/yale_som.db` is a chat agent whose prompt is built from their catalog courses and bio, plus core stats/regression/AI know-how. Agents can look up any other class with database tools.

## Run it

```bash
cd backend
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt
.venv/Scripts/python -m uvicorn app.main:app --port 8000
```

Then run the frontend (`npm run dev` in the repo root). Vite forwards `/api` to port 8000.

Put `PORTKEY_API_KEY` in a `.env` file in `backend/` or any folder above it (see `.env.example`). `OPENAI_MODEL` defaults to `gpt-6-luna`.

## Login and spend limit

- `AUTH_EMAIL` / `AUTH_PASSWORD`: the one login allowed to chat. At startup it's hashed (scrypt, salted) into a `users` table in `backend/state.db` (local runtime state, gitignored). With no `AUTH_EMAIL`, nobody can chat.
- `AUTH_SECRET`: signs login tokens. Set it to a long random string, or logins reset whenever the server restarts.
- `SPEND_LIMIT_USD` (default `0.10`): AI spend allowed per login session, priced from gpt-6-luna's per-token rates in `app/spend.py`. Past it, chat returns "Free Tier Limit Reached". Spend is stored in a `chat_sessions` table in `backend/state.db`.

## Researched professor profiles

`data/yale_som.db` has a `professor_profiles` table (greeting, speaking style, sourced background, avatar appearance, sources). When a professor has a row, their prompt uses it instead of `app/styles/` and `app/profiles/`, and `GET /api/avatars` hands their look to the 3D client. Add one with:

```bash
.venv/Scripts/python scripts/save_profile.py path/to/profile.json
```

Room assignments for the 3D building live in `data/room_assignments.json`.

## Layout

- `app/main.py`: API routes: `POST /api/auth/login`, `GET /api/auth/me`, `GET /api/professors`, `GET /api/professors/{slug}`, `POST /api/professors/{slug}/chat` (login required)
- `app/auth.py`: users table, password hashing, signed tokens
- `app/spend.py`: token prices and per-session spend tracking
- `app/agents.py`: builds one agent per professor (Portkey → OpenAI Responses API)
- `app/tools.py`: `search_courses`, `get_course`, `courses_by_professor`, `courses_by_schedule`
- `app/db.py`: read-only SQLite queries
- `app/prompts/professor.md`: the shared prompt template
- `app/styles/<slug>.md`: a professor's speaking style (optional first line `greeting: ...`, then `---`). Professors without one use `default.md`.

To give another professor a style, add `app/styles/<slug>.md`. The slug is the name lowercased with dashes, e.g. `tauhid-zaman`.
