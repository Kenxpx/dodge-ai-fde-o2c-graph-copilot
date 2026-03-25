# Development Guide

This guide is for anyone extending the project after the initial submission.

## Local workflow

### 1. Create the Python environment

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\python -m pip install -r backend\requirements.txt
```

### 2. Build the database

```powershell
$env:PYTHONPATH='backend'
.\.venv\Scripts\python backend\scripts\build_database.py
```

### 3. Run the backend

```powershell
$env:PYTHONPATH='backend'
.\.venv\Scripts\python -m uvicorn app.main:app --app-dir backend --reload
```

### 4. Run the frontend

```powershell
cd frontend
npm install
npm run dev
```

## Common commands

### Backend tests

```powershell
$env:PYTHONPATH='backend'
.\.venv311\Scripts\python.exe -m pytest backend\tests -q
```

### Frontend build

```powershell
cd frontend
npm run build
```

### API docs locally

Once the backend is running:

- `http://localhost:8000/api`
- `http://localhost:8000/api/docs`
- `http://localhost:8000/api/openapi.json`

## Where to make changes

### If you need to change data modeling

Work in:
- `backend/app/services/ingestion.py`
- `backend/app/schema_catalog.py`

Rebuild the database afterward.

### If you need to change ERP question answering

Work in:
- `backend/app/services/query_service.py`
- `backend/app/services/guardrails.py`
- `backend/app/services/sql_safety.py`

### If you need to change graph behavior

Work in:
- `backend/app/services/graph_service.py`
- `frontend/src/components/GraphCanvas.tsx`

### If you need to change project-help responses

Work in:
- `backend/app/services/project_help_service.py`
- `frontend/src/components/InspectorPanel.tsx`

### If you need to change the operator workflow

Work in:
- `backend/app/services/inbox_service.py`
- `frontend/src/components/ChatPanel.tsx`
- `frontend/src/App.tsx`

## Extension guidelines

### Adding a deterministic ERP flow

1. Add or update the intent match in `query_service.py`.
2. Add the SQL template.
3. Add a hand-shaped summary in `_summarize_template_answer`.
4. Add recommended actions and follow-up questions.
5. Add a focused graph mapping if needed.
6. Add a smoke test.

### Adding a new API route

1. Add a new request or response model to `backend/app/models.py` if needed.
2. Keep the route layer small in `backend/app/api/`.
3. Put business logic in a service under `backend/app/services/`.
4. Add route metadata so it shows up cleanly in `/api/docs`.
5. Update `docs/API.md`.

### Adding a new frontend panel or workflow

1. Keep page-level orchestration in `frontend/src/App.tsx`.
2. Put the visual interaction in a focused component under `frontend/src/components/`.
3. Extend `frontend/src/types.ts` and `frontend/src/api.ts` first so the data flow stays typed.

## Debugging checklist

### Backend starts but answers look wrong

Check:
- whether the database was rebuilt after semantic changes
- whether item-id normalization still matches across joins
- whether cancellation logic still uses `billing_document_type = 'S1'`

### Frontend loads but data is missing

Check:
- backend is running
- Vite proxy is working
- `/api/meta` and `/api/graph/initial` return `200`

### Gemini path behaves oddly

Check:
- `LLM_PROVIDER=gemini`
- `GEMINI_API_KEY` is set
- the prompt is still scoped to in-domain ERP questions
- SQL validation is not rejecting an invalid generated query

## Documentation discipline

Whenever the behavior changes materially, update:
- `README.md` for repository-facing summary
- `docs/API.md` if API behavior changes
- `docs/SETUP_AND_DEPLOYMENT.md` if commands or deployment steps change
- `docs/ARCHITECTURE.md` if core design decisions change
