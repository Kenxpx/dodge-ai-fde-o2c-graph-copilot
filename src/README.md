# Source Map

This repository is split into a backend and frontend application rather than a single monolithic `src/` tree.

## Actual implementation locations

- Backend API and query engine: `backend/app/`
- Frontend application: `frontend/src/`
- Build / ingestion scripts: `backend/scripts/`
- Tests: `backend/tests/`

## Key entry points

- Backend app: `backend/app/main.py`
- Ingestion + semantic model: `backend/app/services/ingestion.py`
- Query orchestration: `backend/app/services/query_service.py`
- Graph service: `backend/app/services/graph_service.py`
- Frontend app shell: `frontend/src/App.tsx`

This file exists to make the repository reviewer-friendly when scanning for a root-level `src/` directory.
