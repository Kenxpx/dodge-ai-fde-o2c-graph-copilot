from fastapi import APIRouter

from app.config import get_settings
from app.models import MetaResponse
from app.services.examples import EXAMPLE_QUERIES
from app.services.graph_service import GraphService


router = APIRouter(prefix="/api/meta", tags=["meta"])


@router.get("", response_model=MetaResponse)
def get_meta() -> MetaResponse:
    settings = get_settings()
    stats = GraphService().get_meta_stats()
    provider_ready = False
    if settings.llm_provider == "gemini":
        provider_ready = bool(settings.gemini_api_key)
    elif settings.llm_provider == "openai_compatible":
        provider_ready = bool(settings.openai_api_key)

    return MetaResponse(
        title=settings.app_name,
        llm_status={
            "provider": settings.llm_provider,
            "ready": provider_ready,
            "model": settings.gemini_model if settings.llm_provider == "gemini" else settings.openai_model,
        },
        dataset_stats=stats,
        example_queries=EXAMPLE_QUERIES,
    )
