# Order-to-Cash Intelligence Copilot

A production-style analysis workspace for the Dodge AI Forward Deployed Engineer take-home.

The project combines:
- grounded ERP question answering over the provided SAP order-to-cash dataset
- a materialized graph for search, tracing, and visual context
- an operator-facing workflow with an operations inbox, guided follow-ups, and exportable investigation briefs
- a documented FastAPI backend that can also be used as a standalone API

## Live links

- Live demo: `https://dodge-ai-o2c-graph-copilot.onrender.com`
- Public repository: `https://github.com/Kenxpx/dodge-ai-fde-o2c-graph-copilot`
- API index: `https://dodge-ai-o2c-graph-copilot.onrender.com/api`
- API docs: `https://dodge-ai-o2c-graph-copilot.onrender.com/api/docs`

## What the project does

This workspace is designed around the core order-to-cash investigation loop:
1. start from an issue bucket, known business object, or plain-language question
2. answer with validated DuckDB SQL over a shared semantic model
3. focus the graph on the entities behind the answer
4. suggest the next useful investigation step
5. export the result when it needs to be handed off

Core workflows supported well:
- invoice tracing across sales order, delivery, billing, A/R, and payment
- broken-flow detection
- cancellation analysis
- open A/R review
- graph search and entity inspection
- project and implementation help through the built-in right-rail guide

## Architecture at a glance

```text
SAP JSONL exports
  -> ingestion pipeline
  -> raw DuckDB tables
  -> semantic SQL views
  -> graph_nodes / graph_edges
  -> FastAPI services and APIs
  -> React workspace
```

Main design choices:
- `DuckDB` for a lightweight, local-first analytical store
- `o2c_flow` as the core semantic view for grounded business questions
- deterministic SQL first for the highest-signal evaluator workflows
- Gemini fallback only for broader in-domain questions
- one shared business model for both graph exploration and question answering

## Repository guide

### Key backend files

- `backend/app/main.py`
  FastAPI entry point, lifecycle bootstrap, API docs configuration, and SPA serving.
- `backend/app/services/ingestion.py`
  Builds the database, semantic views, graph nodes, and graph edges.
- `backend/app/services/query_service.py`
  Main ERP question-answering orchestration.
- `backend/app/services/graph_service.py`
  Search, node detail, graph expansion, and focused subgraph generation.
- `backend/app/services/inbox_service.py`
  Operations inbox used by the UI.
- `backend/app/services/project_help_service.py`
  Project-level help chatbot grounded in repository notes.

### Key frontend files

- `frontend/src/App.tsx`
  Top-level workspace orchestration.
- `frontend/src/components/ChatPanel.tsx`
  ERP chat, operations inbox, and answer actions.
- `frontend/src/components/GraphCanvas.tsx`
  Cytoscape graph canvas and graph controls.
- `frontend/src/components/InspectorPanel.tsx`
  Right rail for entity inspection and project help.

### Docs map

- `docs/ARCHITECTURE.md`
  System design and modeling decisions.
- `docs/PROJECT_STRUCTURE.md`
  Directory-level repository map and ownership guide.
- `docs/DEVELOPMENT.md`
  Developer workflow, commands, extension points, and debugging notes.
- `docs/SETUP_AND_DEPLOYMENT.md`
  Local setup and deployment instructions.
- `docs/API.md`
  Public API guide and examples.
- `docs/AI_SESSION_LOG.md`
  AI-assisted implementation notes.

## Quick start

### Backend

On Windows, native CPython 3.11 is the safest option for DuckDB.

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\python -m pip install -r backend\requirements.txt
$env:PYTHONPATH='backend'
.\.venv\Scripts\python backend\scripts\build_database.py
.\.venv\Scripts\python -m uvicorn app.main:app --app-dir backend --reload
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Vite proxies `/api` to the FastAPI backend during local development.

## Public API

The backend is usable directly as an API.

Important endpoints:
- `GET /api`
- `GET /api/meta`
- `POST /api/query/chat`
- `POST /api/help/chat`
- `GET /api/graph/initial`
- `GET /api/graph/search`
- `GET /api/graph/node/{node_id}`
- `POST /api/graph/expand`
- `POST /api/graph/subgraph`

For examples and response usage, see `docs/API.md`.

## Verification

Checked locally:
- database build
- graph generation
- deterministic ERP flows
- Gemini-backed ERP flow
- API index and OpenAPI docs
- project-help route
- frontend production build
- backend smoke tests via `pytest`

## Notes for evaluation

- The hardest part of this assignment is the data modeling, not the graph widget.
- The project is intentionally optimized for groundedness, readability, and evaluator reliability.
- Deterministic coverage exists for the most important demo paths so the app stays strong even when the LLM path is unavailable.
