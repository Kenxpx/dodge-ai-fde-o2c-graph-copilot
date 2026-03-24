# Order-to-Cash Intelligence Copilot

An analyst-facing copilot for the SAP order-to-cash dataset used in the Dodge AI FDE take-home.

The app does three things well:
- traces business objects across sales order, delivery, billing, A/R, and payment clearance
- surfaces a graph view over the same semantic model used for querying
- answers natural-language questions with grounded SQL, using deterministic paths first and Gemini only when needed

To make it feel more like a real operator tool, I also added:
- an operations inbox for high-signal issue buckets
- guided follow-up questions after each answer
- exportable investigation briefs for sharing findings

## Links

- Live demo: `https://dodge-ai-o2c-graph-copilot.onrender.com`
- Public repository: `https://github.com/Kenxpx/dodge-ai-fde-o2c-graph-copilot`

## What I built

This project is a full-stack web app with:
- a FastAPI backend
- DuckDB as the analytical store
- a semantic layer over the raw SAP exports
- a materialized graph for exploration
- a React frontend for graph search, inspection, and grounded chat
- an operations inbox for incomplete flows, open A/R, cancellations, and missing deliveries
- answer-linked follow-up suggestions and brief export
- Gemini-backed SQL planning for broader in-domain questions

The core design choice was to keep the graph layer and the query layer on top of the same business model. I did not want a separate graph representation drifting away from the SQL representation and producing inconsistent answers.

## Product walkthrough

The app is designed around a simple workflow:
1. Start from the operations inbox, ask a business question, or search for a known entity.
2. Run a grounded query against the semantic O2C model.
3. Return a short business answer, guided follow-ups, the supporting evidence, and the executed SQL.
4. Focus the graph on the same entities so the visual view explains the answer.
5. Export a brief if the result needs to be shared.

That flow matters more for this task than maximizing feature count. I wanted the app to feel dependable and readable first.

## Why this architecture

### DuckDB

I chose DuckDB because the dataset is analytical, read-heavy, and small enough to rebuild locally without extra infrastructure. It made the project easy to run, easy to deploy, and easy to ground LLM answers in actual query execution.

### Semantic views before any chat logic

The raw dataset has the usual ERP quirks:
- item identifiers do not always match format across tables
- billing items reference delivery items, not sales orders directly
- cancellation documents need special handling
- accounting and payment linkage is indirect

Instead of pushing that complexity into prompts or frontend code, I resolved it once in the semantic layer and treated `o2c_flow` as the main business-facing table.

### Deterministic first, LLM second

The most important evaluator flows are predictable:
- top products
- top customers
- billing trace
- incomplete flows
- cancellations
- open A/R

Those paths should not depend on an LLM. I kept them deterministic so the app remains strong even when the model is unavailable, and then used Gemini for broader in-domain questions that are genuinely more open-ended.

## High-level architecture

```text
Raw JSONL dataset
  -> ingestion.py
  -> raw DuckDB tables
  -> semantic SQL views
  -> graph_nodes / graph_edges
  -> FastAPI APIs
  -> React graph + chat UI
```

## Important modeling decisions

### 1. `o2c_flow` is the center of the system

`o2c_flow` is a flattened view at roughly the sales-order-item grain. It is the safest place to answer most business questions because it already carries the lineage between:
- sales orders
- delivery items
- billing items
- accounting documents
- payment clearances

This reduced both query complexity and hallucination risk.

### 2. Cancellation handling is explicit

Cancellation documents are modeled through:
- `billing_document_type = 'S1'`
- `cancelled_billing_document`

That logic is baked into the semantic layer and surfaced in both SQL answers and graph edges.

### 3. The graph is materialized, not improvised in the UI

I materialized `graph_nodes` and `graph_edges` from the semantic views. That keeps search, inspection, and answer-linked graph focus fast and predictable.

## Query strategy

The backend query service uses three layers:

### 1. Guardrails

Off-domain prompts are rejected before any SQL generation.

### 2. Deterministic templates

Known evaluator questions map directly to SQL templates.

### 3. Gemini fallback

If the question is in-domain but not covered by a built-in template, Gemini proposes SQL. That SQL is:
- validated as read-only
- restricted to approved tables
- capped with a row limit
- automatically repaired once if the model makes a schema-level mistake

## Reviewer guide

If I were reading this repo cold, I would start here:
- `backend/app/services/ingestion.py`
  This is where the dataset becomes a usable business model.
- `backend/app/services/query_service.py`
  This is the main orchestration layer for deterministic and Gemini-backed queries.
- `backend/app/services/graph_service.py`
  This is the bridge between answer results and the graph UI.
- `backend/app/services/inbox_service.py`
  This powers the operator-focused issue buckets shown in the operations inbox.
- `frontend/src/App.tsx`
  This shows how the product experience is stitched together.

## Additional docs

- `docs/ARCHITECTURE.md`
- `docs/SETUP_AND_DEPLOYMENT.md`
- `docs/AI_SESSION_LOG.md`

## Project structure

```text
backend/
  app/
    api/
    llm/
    services/
  scripts/
  tests/
docs/
frontend/
  src/
sessions/
src/
Dockerfile
README.md
```

## Running locally

### Backend

On Windows, native CPython works better than MSYS Python for DuckDB wheels.

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

The Vite dev server proxies `/api` to `http://localhost:8000`.

## Deployment

The live demo runs as a single Render web service:
- frontend built into static assets
- FastAPI serving API routes plus the built SPA
- dataset bundled with the container

See:
- `docs/SETUP_AND_DEPLOYMENT.md`
- `docs/ARCHITECTURE.md`

## Environment variables

See `.env.example` for the supported variables.

The deployed app currently uses:
- `APP_ENV=production`
- `LLM_PROVIDER=gemini`
- `GEMINI_MODEL=gemini-2.5-flash`

## Verification

Verified locally:
- ingestion and semantic-layer build
- graph node and edge generation
- deterministic query flows
- Gemini fallback query path
- operations inbox metadata
- guided follow-up suggestions
- investigation brief export
- frontend production build
- backend smoke tests via `pytest`

## Notes for evaluation

- I optimized for clarity and groundedness over breadth.
- The hardest parts of this dataset are not UI problems; they are modeling problems. Most of the work went into resolving lineage and cancellation semantics cleanly.
- Gemini is enabled in production, but the most important evaluator flows are still deterministic so the app stays reliable.
