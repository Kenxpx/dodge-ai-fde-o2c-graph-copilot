# Final Submission

## Public GitHub Repository

https://github.com/Kenxpx/dodge-ai-fde-o2c-graph-copilot

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
- Live hosting: pending hosting-account authentication

## Best deployment target

Use Render for the live demo. This repository is already set up for it with:

- `Dockerfile`
- `render.yaml`

## Exact final step

1. Open Render and create a new Web Service from the GitHub repo.
2. Select `Kenxpx/dodge-ai-fde-o2c-graph-copilot`.
3. Keep the Docker deployment path.
4. Deploy and copy the generated HTTPS URL into the Google Form.

## Suggested Google Form values

- Name: your full name
- Email: `sachinbinduc@gmail.com`
- Live Demo / Deployed Application: Render URL after deployment
- Public GitHub Repository: `https://github.com/Kenxpx/dodge-ai-fde-o2c-graph-copilot`
- AI Coding Sessions / Prompt Logs: upload `ai-coding-sessions.zip`

## Anything else you'd want us to know?

The implementation uses a shared semantic layer for both the graph UI and grounded SQL answers, with deterministic query paths for the highest-signal evaluator workflows and an optional LLM fallback for open-ended in-domain questions. I intentionally optimized for groundedness, cancellation handling, item-level lineage, and evaluator reliability rather than broad but shallow ERP coverage.
