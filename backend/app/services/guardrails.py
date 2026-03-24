import re

from app.schema_catalog import DOMAIN_HINTS, OFF_TOPIC_HINTS


ID_PATTERNS = [
    re.compile(r"\b7\d{5}\b"),
    re.compile(r"\b8\d{7}\b"),
    re.compile(r"\b9\d{7}\b"),
    re.compile(r"\b3\d{8}\b"),
]


def classify_domain(question: str) -> tuple[bool, str]:
    normalized = question.lower().strip()
    if any(pattern.search(normalized) for pattern in ID_PATTERNS):
        return True, "Question contains an in-domain business document identifier."

    domain_score = sum(1 for hint in DOMAIN_HINTS if hint in normalized)
    off_topic_score = sum(1 for hint in OFF_TOPIC_HINTS if hint in normalized)

    if domain_score == 0 and off_topic_score > 0:
        return False, "Prompt appears unrelated to the ERP dataset domain."
    if domain_score == 0:
        return False, "Prompt does not mention the order-to-cash dataset or related ERP entities."
    return True, "Prompt is within the ERP order-to-cash domain."
