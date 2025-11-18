# Document Chat

Document Chat is a lightweight end-to-end Retrieval Augmented Generation (RAG) playground. It lets you upload documents, chunks them, embeds them with Voyage AI, stores vectors in Postgres/pgvector, and serves a conversational UI powered by DeepSeek via FastAPI + React.

---

## Features
- FastAPI backend with async RAG pipeline (chunking, embedding, retrieval, chat completion)
- Postgres + pgvector persistence
- React + Vite frontend with Tailwind UI components
- Simple onboarding (no orchestration tooling required)
- Works with any DeepSeek-compatible LLM endpoint and Voyage embedding model

---

## Architecture
```
┌─────────┐      upload       ┌────────────┐      embeddings      ┌─────────┐
│ Frontend├──────────────────▶│ FastAPI API├──────────────────────▶│ Voyage  │
└────┬────┘                   └────┬───────┘                      └────┬────┘
     │                             │ retrieval/query                     │
     │ chat history                ▼                                     │
     └──────────────────────▶  Postgres + pgvector ◀─────────────────────┘
```

---

## Prerequisites
- Python 3.11+
- Node.js 18+ (includes npm)
- Running Postgres instance with pgvector extension enabled

---

## Environment variables
Create `backend/.env` (copy from `.env.example` if available) and set:
- `DATABASE_URL=postgresql+psycopg2://user:pass@localhost:5432/chat_vector`
- `DEEPSEEK_API_KEY` – Chat completion provider
- `DEEPSEEK_BASE_URL` – Optional override, default `https://api.deepseek.com`
- `VOYAGE_API_KEY` – Embedding provider key
- `VOYAGE_MODEL` – Defaults to `voyage-3.5`

---

## Backend setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m app.db.init_db         # create tables
uvicorn app.main:app --reload --port 8000
```

---

## Frontend setup
```bash
cd frontend
npm install               # or pnpm install
npm run dev               # defaults to http://localhost:5173
```

Frontend expects the API at `http://localhost:8000`. Adjust `vite.config.ts` proxy or browser env vars if the backend runs elsewhere.

---

## Useful commands
- `backend`: `pytest` (if/when tests are added), `ruff check`, `mypy app`
- `frontend`: `npm run build`, `npm run lint`

---
