# Project Structure Guide

This document explains how the repository is organized and where to look when changing a specific part of the system.

## Top-level layout

```text
backend/     FastAPI application, service layer, scripts, and tests
docs/        Architecture, setup, API, and developer-facing documentation
frontend/    React workspace and UI components
sessions/    AI workflow and coding session notes
src/         Submission-required placeholder folder kept in the public repo layout
```

## Backend

### `backend/app/`

Core application package.

Important files:
- `main.py`
  Application entry point, API docs configuration, and frontend serving.
- `config.py`
  Environment configuration and path defaults.
- `db.py`
  DuckDB connection management.
- `models.py`
  Shared request and response models used across API routes.
- `schema_catalog.py`
  Query safety and schema guidance for grounded SQL generation.

### `backend/app/api/`

Route layer only. These files stay intentionally small and delegate business logic to services.

- `index.py`
  API discovery route.
- `meta.py`
  Workspace metadata and ops inbox.
- `query.py`
  ERP question answering.
- `help.py`
  Project-level help chatbot.
- `graph.py`
  Graph search, node detail, expansion, and focused subgraphs.

### `backend/app/services/`

Business logic lives here.

- `ingestion.py`
  Raw dataset loading, semantic model creation, and graph materialization.
- `query_service.py`
  Deterministic ERP query selection, Gemini fallback, answer shaping, and graph focus selection.
- `graph_service.py`
  Graph search and graph payload generation.
- `inbox_service.py`
  Operator-facing issue buckets.
- `project_help_service.py`
  Project-aware help answers grounded in repository notes.
- `guardrails.py`
  Domain filtering for the ERP chat path.
- `sql_safety.py`
  Read-only validation and query limiting.
- `examples.py`
  Example questions exposed in the UI.

### `backend/scripts/`

- `build_database.py`
  Local command-line entry point for building the DuckDB database from the bundled dataset.

### `backend/tests/`

- `test_smoke.py`
  Smoke coverage for guardrails, deterministic query routing, inbox behavior, help responses, and API/docs availability.

## Frontend

### `frontend/src/`

- `App.tsx`
  Top-level application state and orchestration.
- `api.ts`
  Typed frontend API client.
- `types.ts`
  Shared frontend response and message types.
- `App.css`
  Main layout and component styling.
- `index.css`
  global theme variables and typography.

### `frontend/src/components/`

- `ChatPanel.tsx`
  ERP chat, operations inbox, answer actions, and composer.
- `GraphCanvas.tsx`
  Cytoscape graph rendering and graph controls.
- `InspectorPanel.tsx`
  Entity explorer plus project-help chatbot in the right rail.

## Docs

- `ARCHITECTURE.md`
  Design decisions and modeling choices.
- `PROJECT_STRUCTURE.md`
  This file.
- `DEVELOPMENT.md`
  Developer workflow and extension guide.
- `SETUP_AND_DEPLOYMENT.md`
  Environment setup and hosting path.
- `API.md`
  Public API usage examples.
- `AI_SESSION_LOG.md`
  AI-assisted build notes.

## Recommended reading order

For a reviewer:
1. `README.md`
2. `docs/ARCHITECTURE.md`
3. `docs/API.md`
4. `backend/app/services/ingestion.py`
5. `backend/app/services/query_service.py`
6. `frontend/src/App.tsx`

For a developer extending the project:
1. `README.md`
2. `docs/PROJECT_STRUCTURE.md`
3. `docs/DEVELOPMENT.md`
4. `docs/ARCHITECTURE.md`
