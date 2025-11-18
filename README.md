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
- (Optional) Tesseract OCR binary + language data if you want scanned PDFs parsed

---

## Environment variables
Create `backend/.env` (copy from `.env.example` if available) and set:
- `DATABASE_URL=postgresql+psycopg2://user:pass@localhost:5432/chat_vector`
- `DEEPSEEK_API_KEY` – Chat completion provider
- `DEEPSEEK_BASE_URL` – Optional override, default `https://api.deepseek.com`
- `VOYAGE_API_KEY` – Embedding provider key
- `VOYAGE_MODEL` – Defaults to `voyage-3.5`
- `ENABLE_OCR` – `true` (default) to use OCR fallback when PDFs lack text; set to `false` to disable OCR
- `TESSERACT_LANGS` – Languages to load for OCR (default `amh+eng`, requires installed language data)

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

## OCR (scanned PDFs)
OCR is only used when PDF text extraction returns nothing.

### Install system dependencies
- Ubuntu/Debian:
  ```bash
  sudo apt-get update
  sudo apt-get install -y tesseract-ocr tesseract-ocr-amh poppler-utils
  ```
- macOS (Homebrew):
  ```bash
  brew install tesseract poppler
  brew install tesseract-lang    # ensure Amharic data is installed if needed
  ```

### Configure
- `ENABLE_OCR=true` (default) to allow OCR fallback; set `false` to reject scanned PDFs.
- `TESSERACT_LANGS` to match installed language data (default `amh+eng`).
- Restart the backend after changing OCR env vars or installing language packs.

If OCR is disabled or a required language pack is missing, scanned PDF uploads will return an error with details.

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
