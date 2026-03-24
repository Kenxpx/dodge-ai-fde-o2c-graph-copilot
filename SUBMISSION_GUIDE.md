# Submission Guide

This repository is ready for the Dodge AI FDE submission flow, with a few final publication steps that must happen from your own GitHub and hosting accounts.

## What is already included

- Public-repo-friendly code layout with `backend/`, `frontend/`, root `src/`, and `sessions/`
- Architecture and guardrail write-up in `README.md`
- AI workflow summaries in `sessions/` and `docs/AI_SESSION_LOG.md`
- Dockerized single-service deployment path through `Dockerfile`
- Optional `render.yaml` for a simple Render deployment

## Files to point reviewers to

- Main README: `README.md`
- Backend app entry point: `backend/app/main.py`
- Semantic ingestion pipeline: `backend/app/services/ingestion.py`
- Query orchestration and prompting path: `backend/app/services/query_service.py`
- AI session logs: `sessions/` and `docs/AI_SESSION_LOG.md`

## Publish the repository

```powershell
git init
git add .
git commit -m "Initial Dodge AI FDE submission"
```

Then create a GitHub repository from your account and push the code:

```powershell
git remote add origin https://github.com/<your-username>/<your-repo>.git
git branch -M main
git push -u origin main
```

## Deploy a live demo

### Option 1: Render

1. Push this repository to GitHub.
2. In Render, create a new Web Service from the GitHub repo.
3. Choose Docker deployment. The included `Dockerfile` and `render.yaml` are already aligned to that path.
4. Deploy and copy the generated HTTPS URL.

### Option 2: Any Docker-compatible host

```powershell
docker build -t dodge-ai-o2c-graph-copilot .
docker run --rm -p 8000:8000 dodge-ai-o2c-graph-copilot
```

The application serves both the API and frontend from the same service on port `8000`.

## Form fields

- Name: your full name
- Email: `sachinbinduc@gmail.com`
- Live Demo / Deployed Application: paste the deployed HTTPS URL
- Public GitHub Repository: paste the public repo URL
- AI Coding Sessions / Prompt Logs: upload `ai-coding-sessions.zip`

## Suggested "Anything else you'd want us to know?" answer

The implementation uses a shared semantic layer for both the graph UI and grounded SQL answers, with deterministic query paths for the highest-signal evaluator workflows and an optional LLM fallback for open-ended in-domain questions. I intentionally optimized for groundedness, cancellation handling, item-level lineage, and evaluator reliability rather than broad but shallow ERP coverage.
