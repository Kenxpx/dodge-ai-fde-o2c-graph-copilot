from fastapi import APIRouter

from app.models import HelpChatRequest, HelpChatResponse
from app.services.project_help_service import ProjectHelpService


router = APIRouter(prefix="/api/help", tags=["help"])
service = ProjectHelpService()


@router.post("/chat", response_model=HelpChatResponse)
async def project_help(request: HelpChatRequest) -> HelpChatResponse:
    return await service.answer(request)
