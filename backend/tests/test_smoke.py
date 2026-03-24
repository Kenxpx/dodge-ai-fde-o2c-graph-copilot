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
