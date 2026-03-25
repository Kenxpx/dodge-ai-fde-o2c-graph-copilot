from fastapi import APIRouter

from app.models import ChatRequest, ChatResponse
from app.services.query_service import QueryService


router = APIRouter(prefix="/api/query", tags=["query"])
service = QueryService()


@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Grounded ERP question answering",
    description="Answer in-domain SAP order-to-cash questions using deterministic SQL templates first and Gemini-backed planning when needed.",
)
async def chat_query(request: ChatRequest) -> ChatResponse:
    return await service.answer(request)
