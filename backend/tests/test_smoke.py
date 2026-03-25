import asyncio

from app.models import ChatRequest, HelpChatRequest
from app.services.inbox_service import InboxService
from app.services.project_help_service import ProjectHelpService
from app.services.guardrails import classify_domain
from app.services.query_service import QueryService


def test_domain_guardrail_accepts_erp_question() -> None:
    allowed, _ = classify_domain("Trace billing document 90504298 through the order-to-cash flow")
    assert allowed


def test_domain_guardrail_rejects_off_topic_prompt() -> None:
    allowed, _ = classify_domain("Write a poem about the ocean")
    assert not allowed


def test_template_query_supports_top_customers() -> None:
    service = QueryService()
    template = service._template_query("Which customers generated the most billing documents?")
    assert template is not None
    assert template[0] == "template_top_customers"


def test_template_query_supports_billing_trace() -> None:
    service = QueryService()
    template = service._template_query("Trace the full flow of billing document 90504298.")
    assert template is not None
    assert template[0] == "template_trace_billing_document"


def test_inbox_surfaces_core_operator_issues() -> None:
    items = InboxService().get_items()
    item_map = {item.id: item for item in items}

    assert {"delivered_not_billed", "open_ar", "cancellations", "orders_without_delivery"} <= set(item_map)
    assert item_map["cancellations"].count == 80
    assert item_map["orders_without_delivery"].count == 14


def test_trace_answer_includes_follow_ups_and_graph_focus() -> None:
    service = QueryService()
    response = asyncio.run(
        service.answer(
            ChatRequest(
                question="Trace the full flow of billing document 90504298.",
                conversation=[],
                focus_node_ids=[],
            )
        )
    )

    assert response.answer_title == "Billing document trace"
    assert response.recommended_actions
    assert response.follow_up_questions
    assert "billing_document:90504298" in response.graph.focus_node_ids


def test_project_help_answers_project_questions() -> None:
    service = ProjectHelpService()
    response = asyncio.run(
        service.answer(
            HelpChatRequest(
                question="Who built this project and what was the goal?",
                conversation=[],
            )
        )
    )

    assert response.answer_title
    assert "Sachin Bindu C" in response.answer
    assert response.citations


def test_api_index_and_docs_are_available() -> None:
    from fastapi.testclient import TestClient

    from app.main import app

    client = TestClient(app)
    index_response = client.get("/api")
    docs_response = client.get("/api/docs")
    openapi_response = client.get("/api/openapi.json")

    assert index_response.status_code == 200
    payload = index_response.json()
    assert payload["docs_url"] == "/api/docs"
    assert any(endpoint["path"] == "/api/query/chat" for endpoint in payload["endpoints"])

    assert docs_response.status_code == 200
    assert openapi_response.status_code == 200
    assert "/api/help/chat" in openapi_response.text
