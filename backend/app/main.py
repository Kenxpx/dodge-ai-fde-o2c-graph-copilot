from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.api.graph import router as graph_router
from app.api.meta import router as meta_router
from app.api.query import router as query_router
from app.config import get_settings
from app.db import get_connection
from app.services.ingestion import build_database


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    with get_connection(read_only=False) as connection:
        needs_bootstrap = not settings.db_path.exists()
        if not needs_bootstrap:
            try:
                connection.execute("SELECT 1 FROM app_metadata LIMIT 1").fetchone()
            except Exception:
                needs_bootstrap = True
        if needs_bootstrap:
            build_database(connection, settings.dataset_root)
    yield


settings = get_settings()
app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(meta_router)
app.include_router(graph_router)
app.include_router(query_router)


frontend_dist = settings.base_dir / "frontend" / "dist"


@app.get("/", include_in_schema=False, response_model=None)
def serve_root():
    index_path = frontend_dist / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    return {"message": "Frontend build not found. Run `npm run build` inside `frontend/`."}


@app.get("/{full_path:path}", include_in_schema=False, response_model=None)
def serve_spa(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")

    requested_path = frontend_dist / full_path
    if requested_path.exists() and requested_path.is_file():
        return FileResponse(requested_path)

    index_path = frontend_dist / "index.html"
    if index_path.exists():
        return FileResponse(index_path)

    return {"message": "Frontend build not found. Run `npm run build` inside `frontend/`."}
