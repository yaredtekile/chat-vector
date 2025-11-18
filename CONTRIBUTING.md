# Contributing to Document Chat

Thanks for your interest in improving Document Chat! This project is a small FastAPI + React RAG playground that depends on Postgres/pgvector, so a little setup helps everything run smoothly.

## How to contribute
- **Report issues**: Bug reports and feature requests are welcome—include steps to reproduce, expected vs. actual behavior, and your environment.
- **Submit pull requests**: All code changes go through PRs. Keep changes focused, describe the problem and solution, and mention any follow-up work you intentionally left out.
- **Improve docs**: Clarify setup steps, add troubleshooting notes, or inline comments where the code is non-obvious.

## Pull request workflow
1. **Fork** this repository to your own GitHub account.
2. **Create a branch** in your fork for each change (`git checkout -b feature/my-change`).
3. **Make and test your changes**, keeping commits small and descriptive.
4. **Open a Pull Request** from your branch to this repo, explaining the context, solution, and any testing performed.

## Local setup
Backend:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # fill in secrets; do not commit .env
python -m app.db.init_db
uvicorn app.main:app --reload --port 8000
```

Frontend:
```bash
cd frontend
npm install  # or pnpm install
npm run dev  # defaults to http://localhost:5173, expects API at http://localhost:8000
```

## Development guidelines
- **Style & checks**: For backend changes, run `ruff check` and `mypy app` if available. For frontend changes, ensure `npm run build` succeeds (it runs type-check + Vite build).
- **Secrets**: Never commit API keys or `.env` files. Use placeholders in examples.
- **Database**: The app expects Postgres with the pgvector extension; keep migrations or schema changes minimal and documented.
- **Tests**: Add or update tests when introducing new behavior. If you cannot, explain why in the PR.
- **Docs**: Update `README.md` or in-code comments when behavior or setup steps change.

## Pull request checklist
- [ ] The change has a clear goal and minimal scope.
- [ ] Code builds locally (`uvicorn` starts for backend; `npm run build` passes for frontend).
- [ ] Relevant tests are added or updated (or rationale provided).
- [ ] Configuration secrets are kept out of the repo.
- [ ] Documentation is updated when needed.
