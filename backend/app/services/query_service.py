from __future__ import annotations

import re
from typing import Any

from app.config import get_settings
from app.db import get_connection
from app.llm.providers import get_llm_provider
from app.models import ChatRequest, ChatResponse, EvidenceTable
from app.schema_catalog import ALLOWED_TABLES, ANSWER_GUIDE, SCHEMA_GUIDE
from app.services.graph_service import GraphService
from app.services.guardrails import classify_domain
from app.services.sql_safety import ensure_limit, validate_read_only_sql


ID_REGEX = re.compile(r"\b\d{6,10}\b")


class QueryService:
    def __init__(self) -> None:
        self.graph_service = GraphService()
        self.provider = get_llm_provider()

    def _execute_sql(self, sql: str) -> EvidenceTable:
        validated = validate_read_only_sql(sql, ALLOWED_TABLES)
        limited = ensure_limit(validated, get_settings().max_query_rows)
        with get_connection() as connection:
            result = connection.execute(limited)
            columns = [column[0] for column in result.description]
            rows = result.fetchall()
        return EvidenceTable(
            sql=limited,
            columns=columns,
            rows=[list(row) for row in rows],
            row_count=len(rows),
        )

    def _format_markdown_table(self, evidence: EvidenceTable, max_rows: int = 8) -> str:
        if not evidence.rows:
            return "No matching rows were returned."
        header = "| " + " | ".join(evidence.columns) + " |"
        divider = "| " + " | ".join("---" for _ in evidence.columns) + " |"
        body = [
            "| " + " | ".join("" if value is None else str(value) for value in row) + " |"
            for row in evidence.rows[:max_rows]
        ]
        if evidence.row_count > max_rows:
            body.append(f"| ... | {evidence.row_count - max_rows} more rows omitted |")
        return "\n".join([header, divider, *body])

    def _summarize_template_answer(self, strategy: str, evidence: EvidenceTable) -> str | None:
        if evidence.row_count == 0:
            return f"No matching records were found for `{strategy}`."

        if strategy == "template_top_products":
            top_rows = evidence.rows[:3]
            summary = ", ".join(
                f"{row[1]} ({row[2]} billing docs)" for row in top_rows
            )
            return (
                f"The highest-billed products are {summary}. "
                f"The result set contains the top {min(evidence.row_count, 10)} products ranked by distinct billing-document count.\n\n"
                f"{self._format_markdown_table(evidence)}"
            )

        if strategy == "template_trace_billing_document":
            first = evidence.rows[0]
            return (
                f"Billing document `{first[8]}` traces back to sales order `{first[0]}` for customer `{first[2]}` "
                f"and product `{first[5]}`. The linked delivery is `{first[6]}`, the accounting document is `{first[11]}`, "
                f"and the payment-clearing document is `{first[12]}`.\n\n"
                f"{self._format_markdown_table(evidence)}"
            )

        if strategy == "template_incomplete_flows":
            total_orders = evidence.row_count
            delivered_not_billed = sum(int(row[3] or 0) for row in evidence.rows)
            without_delivery = sum(int(row[2] or 0) for row in evidence.rows)
            billed_not_cleared = sum(int(row[4] or 0) for row in evidence.rows)
            return (
                f"I found `{total_orders}` sales orders with incomplete flow signals. "
                f"Across those orders there are `{without_delivery}` items without delivery, "
                f"`{delivered_not_billed}` delivered-but-not-billed items, and "
                f"`{billed_not_cleared}` billed-but-not-cleared items.\n\n"
                f"{self._format_markdown_table(evidence)}"
            )

        if strategy == "template_cancellations":
            return (
                f"I found `{evidence.row_count}` cancellation billing documents (`S1`) in the dataset. "
                f"Each row shows the cancellation document and the original billing document it reverses.\n\n"
                f"{self._format_markdown_table(evidence)}"
            )

        if strategy == "template_open_ar":
            return (
                f"I found `{evidence.row_count}` open accounting-document rows without a clearing date. "
                f"These represent billed A/R items that have not yet been cleared by a payment document in the dataset.\n\n"
                f"{self._format_markdown_table(evidence)}"
            )

        return None

    def _template_query(self, question: str) -> tuple[str, str] | None:
        normalized = question.lower()
        if "highest number of billing" in normalized or "most billing" in normalized:
            return (
                "template_top_products",
                """
                SELECT
                    product_id,
                    product_description,
                    COUNT(DISTINCT billing_document) AS billing_document_count
                FROM o2c_flow
                WHERE billing_document IS NOT NULL
                GROUP BY 1, 2
                ORDER BY billing_document_count DESC, product_id ASC
                LIMIT 10
                """,
            )

        if any(token in normalized for token in ["broken", "incomplete flow", "delivered but not billed", "not billed"]):
            return (
                "template_incomplete_flows",
                """
                WITH item_status AS (
                    SELECT
                        sales_order,
                        sales_order_item,
                        MAX(CASE WHEN delivery_document IS NOT NULL THEN 1 ELSE 0 END) AS has_delivery,
                        MAX(CASE WHEN billing_document IS NOT NULL THEN 1 ELSE 0 END) AS has_billing,
                        MAX(CASE WHEN payment_document IS NOT NULL THEN 1 ELSE 0 END) AS has_payment
                    FROM o2c_flow
                    GROUP BY 1, 2
                )
                SELECT
                    sales_order,
                    COUNT(*) AS item_count,
                    SUM(CASE WHEN has_delivery = 0 THEN 1 ELSE 0 END) AS items_without_delivery,
                    SUM(CASE WHEN has_delivery = 1 AND has_billing = 0 THEN 1 ELSE 0 END) AS delivered_not_billed_items,
                    SUM(CASE WHEN has_billing = 1 AND has_payment = 0 THEN 1 ELSE 0 END) AS billed_not_cleared_items
                FROM item_status
                GROUP BY 1
                HAVING items_without_delivery > 0
                    OR delivered_not_billed_items > 0
                    OR billed_not_cleared_items > 0
                ORDER BY delivered_not_billed_items DESC, items_without_delivery DESC, billed_not_cleared_items DESC, sales_order ASC
                LIMIT 25
                """,
            )

        if "cancel" in normalized and "billing" in normalized:
            return (
                "template_cancellations",
                """
                SELECT
                    billing_document,
                    billing_document_type,
                    cancelled_billing_document,
                    customer_id,
                    billing_document_date,
                    billing_total_net_amount
                FROM o2c_flow
                WHERE billing_document_type = 'S1'
                GROUP BY 1, 2, 3, 4, 5, 6
                ORDER BY billing_document DESC
                LIMIT 25
                """,
            )

        if "open accounting" in normalized or "not been cleared" in normalized or "unpaid" in normalized:
            return (
                "template_open_ar",
                """
                SELECT
                    billing_document,
                    accounting_document,
                    customer_id,
                    product_description,
                    billing_item_net_amount,
                    posting_date,
                    clearing_date
                FROM o2c_flow
                WHERE accounting_document IS NOT NULL
                  AND clearing_date IS NULL
                ORDER BY posting_date ASC, billing_document ASC
                LIMIT 25
                """,
            )

        doc_ids = ID_REGEX.findall(question)
        if doc_ids and any(token in normalized for token in ["trace", "flow", "lineage"]):
            billing_document = doc_ids[0]
            return (
                "template_trace_billing_document",
                f"""
                SELECT
                    sales_order,
                    sales_order_item,
                    customer_id,
                    customer_name,
                    product_id,
                    product_description,
                    delivery_document,
                    delivery_item,
                    billing_document,
                    billing_document_type,
                    cancelled_billing_document,
                    accounting_document,
                    payment_document
                FROM o2c_flow
                WHERE billing_document = '{billing_document}'
                   OR cancelled_billing_document = '{billing_document}'
                ORDER BY sales_order, sales_order_item
                LIMIT 25
                """,
            )
        return None

    async def _generate_sql_with_llm(self, request: ChatRequest) -> dict[str, Any]:
        assert self.provider is not None
        conversation_text = "\n".join(f"{turn.role}: {turn.content}" for turn in request.conversation[-6:])
        prompt = f"""
Question: {request.question}

Conversation:
{conversation_text or 'No previous conversation.'}

Return a JSON object with:
- analysis: short reasoning summary
- sql: one DuckDB SELECT statement
- answer_shape: what the result should show
- confidence: number from 0 to 1
""".strip()
        return await self.provider.complete_json(SCHEMA_GUIDE, prompt)

    async def _synthesize_answer(self, question: str, evidence: EvidenceTable, strategy: str) -> str:
        template_summary = self._summarize_template_answer(strategy, evidence)
        if template_summary is not None:
            return template_summary
        if self.provider is None:
            return f"Used `{strategy}` to answer the question from the dataset.\n\n{self._format_markdown_table(evidence)}"
        prompt = f"""
Question: {question}
Strategy: {strategy}
SQL:
{evidence.sql}

Result preview:
{self._format_markdown_table(evidence, max_rows=12)}
""".strip()
        result = await self.provider.complete_text(ANSWER_GUIDE, prompt)
        return result.text.strip()

    async def answer(self, request: ChatRequest) -> ChatResponse:
        allowed, reason = classify_domain(request.question)
        if not allowed:
            return ChatResponse(
                answer="This system is designed to answer questions related to the provided SAP order-to-cash dataset only.",
                strategy="guardrail_rejection",
                warnings=[reason],
                citations=[],
                sql=None,
                evidence=None,
                graph=self.graph_service.initial_graph(),
            )

        warnings = [reason]
        strategy = "llm_sql"
        template = self._template_query(request.question)
        if template is not None:
            strategy, sql = template
            evidence = self._execute_sql(sql)
        else:
            if self.provider is None:
                return ChatResponse(
                    answer=(
                        "The deterministic engine could not confidently map that question to a built-in business query. "
                        "Set `LLM_PROVIDER` plus an API key in `.env` to enable dynamic natural-language-to-SQL planning, "
                        "or try one of the demo questions shown in the UI."
                    ),
                    strategy="needs_llm_provider",
                    warnings=warnings,
                    citations=["No LLM provider configured."],
                    sql=None,
                    evidence=None,
                    graph=self.graph_service.initial_graph(),
                )
            llm_plan = await self._generate_sql_with_llm(request)
            sql = llm_plan["sql"]
            warnings.append(f"LLM confidence: {llm_plan.get('confidence', 'unknown')}")
            evidence = self._execute_sql(sql)

        answer = await self._synthesize_answer(request.question, evidence, strategy)
        focus_nodes = request.focus_node_ids or self.graph_service.infer_focus_nodes(evidence.columns, evidence.rows)
        graph = self.graph_service.subgraph(node_ids=focus_nodes, depth=1, limit=110) if focus_nodes else self.graph_service.initial_graph()
        return ChatResponse(
            answer=answer,
            strategy=strategy,
            warnings=warnings,
            citations=[
                "Answers are grounded in DuckDB SQL over the provided SAP O2C dataset.",
                "Cancellation handling is modeled through billing document type S1 and cancelled_billing_document links.",
            ],
            sql=evidence.sql,
            evidence=evidence,
            graph=graph,
        )
