# Final Submission

## Public GitHub Repository

https://github.com/Kenxpx/dodge-ai-fde-o2c-graph-copilot

## Live Demo

https://dodge-ai-o2c-graph-copilot.onrender.com

## Uploadable AI Session Logs

- `ai-coding-sessions.zip`
- `sessions/codex-session-summary.md`
- `docs/AI_SESSION_LOG.md`

## Main files for the evaluator

- `README.md`
- `SUBMISSION_GUIDE.md`
- `backend/app/main.py`
- `backend/app/services/ingestion.py`
- `backend/app/services/query_service.py`
- `frontend/src/App.tsx`
- `sessions/`
- `src/`

## Deployment status

- GitHub repo: complete
- Local verification: complete
- Live hosting: complete

## Hosting target

Render is now live for this submission using:

- `Dockerfile`
- `render.yaml`

## Suggested Google Form values

- Name: your full name
- Email: `sachinbinduc@gmail.com`
- Live Demo / Deployed Application: `https://dodge-ai-o2c-graph-copilot.onrender.com`
- Public GitHub Repository: `https://github.com/Kenxpx/dodge-ai-fde-o2c-graph-copilot`
- AI Coding Sessions / Prompt Logs: upload `ai-coding-sessions.zip`

## Anything else you'd want us to know?

The implementation uses a shared semantic layer for both the graph UI and grounded SQL answers, with deterministic query paths for the highest-signal evaluator workflows and an optional LLM fallback for open-ended in-domain questions. I intentionally optimized for groundedness, cancellation handling, item-level lineage, and evaluator reliability rather than broad but shallow ERP coverage.
