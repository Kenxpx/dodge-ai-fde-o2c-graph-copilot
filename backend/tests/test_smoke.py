from app.services.guardrails import classify_domain


def test_domain_guardrail_accepts_erp_question() -> None:
    allowed, _ = classify_domain("Trace billing document 90504298 through the order-to-cash flow")
    assert allowed


def test_domain_guardrail_rejects_off_topic_prompt() -> None:
    allowed, _ = classify_domain("Write a poem about the ocean")
    assert not allowed
