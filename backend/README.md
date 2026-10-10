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

## Layout

- `app/main.py`: API routes: `GET /api/professors`, `GET /api/professors/{slug}`, `POST /api/professors/{slug}/chat`
- `app/agents.py`: builds one agent per professor (Portkey → OpenAI Responses API)
- `app/tools.py`: `search_courses`, `get_course`, `courses_by_professor`, `courses_by_schedule`
- `app/db.py`: read-only SQLite queries
- `app/prompts/professor.md`: the shared prompt template
- `app/styles/<slug>.md`: a professor's speaking style (optional first line `greeting: ...`, then `---`). Professors without one use `default.md`.

To give another professor a style, add `app/styles/<slug>.md`. The slug is the name lowercased with dashes, e.g. `tauhid-zaman`.
