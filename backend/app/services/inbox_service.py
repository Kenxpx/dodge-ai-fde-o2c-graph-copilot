from __future__ import annotations

from collections.abc import Sequence

from app.db import get_connection
from app.models import InboxItem


class InboxService:
    def get_items(self) -> list[InboxItem]:
        # The inbox is intentionally small. I only surface the issue buckets that
        # feel immediately useful to an operator reviewing this dataset.
        return [
            self._delivered_not_billed(),
            self._open_ar_items(),
            self._cancellations(),
            self._orders_without_delivery(),
        ]

    def _scalar(self, sql: str) -> int:
        with get_connection() as connection:
            value = connection.execute(sql).fetchone()
        return int(value[0]) if value and value[0] is not None else 0

    def _rows(self, sql: str) -> Sequence[tuple]:
        with get_connection() as connection:
            return connection.execute(sql).fetchall()

    def _delivered_not_billed(self) -> InboxItem:
        count = self._scalar(
            """
            WITH item_status AS (
                SELECT
                    sales_order,
                    sales_order_item,
                    MAX(CASE WHEN delivery_document IS NOT NULL THEN 1 ELSE 0 END) AS has_delivery,
                    MAX(CASE WHEN billing_document IS NOT NULL THEN 1 ELSE 0 END) AS has_billing
                FROM o2c_flow
                GROUP BY 1, 2
            ),
            impacted_orders AS (
                SELECT
                    sales_order
                FROM item_status
                GROUP BY 1
                HAVING SUM(CASE WHEN has_delivery = 1 AND has_billing = 0 THEN 1 ELSE 0 END) > 0
            )
            SELECT COUNT(*)
            FROM impacted_orders
            """
        )
        rows = self._rows(
            """
            WITH item_status AS (
                SELECT
                    sales_order,
                    sales_order_item,
                    MAX(CASE WHEN delivery_document IS NOT NULL THEN 1 ELSE 0 END) AS has_delivery,
                    MAX(CASE WHEN billing_document IS NOT NULL THEN 1 ELSE 0 END) AS has_billing
                FROM o2c_flow
                GROUP BY 1, 2
            )
            SELECT
                sales_order,
                SUM(CASE WHEN has_delivery = 1 AND has_billing = 0 THEN 1 ELSE 0 END) AS delivered_not_billed_items
            FROM item_status
            GROUP BY 1
            HAVING delivered_not_billed_items > 0
            ORDER BY delivered_not_billed_items DESC, sales_order ASC
            LIMIT 5
            """
        )
        sample_ids = [str(row[0]) for row in rows[:3]]
        return InboxItem(
            id="delivered_not_billed",
            title="Delivered, not billed",
            summary="Orders that reached delivery but still have no billing document.",
            severity="high",
            count=count,
            sample_ids=sample_ids,
            focus_node_ids=[f"sales_order:{sales_order}" for sales_order in sample_ids],
            drill_question="Identify sales orders that have broken or incomplete flows.",
        )

    def _open_ar_items(self) -> InboxItem:
        count = self._scalar(
            """
            SELECT COUNT(DISTINCT accounting_document)
            FROM o2c_flow
            WHERE accounting_document IS NOT NULL
              AND clearing_date IS NULL
            """
        )
        rows = self._rows(
            """
            SELECT
                accounting_document,
                billing_document
            FROM o2c_flow
            WHERE accounting_document IS NOT NULL
              AND clearing_date IS NULL
            GROUP BY 1, 2
            ORDER BY accounting_document ASC
            LIMIT 8
            """
        )
        sample_ids = [str(row[0]) for row in rows[:3]]
        return InboxItem(
            id="open_ar",
            title="Open A/R items",
            summary="Posted receivables that still have no clearing date in the dataset.",
            severity="high",
            count=count,
            sample_ids=sample_ids,
            focus_node_ids=[f"accounting_document:{value}" for value in sample_ids],
            drill_question="Show me open accounting documents that have not been cleared by a payment.",
        )

    def _cancellations(self) -> InboxItem:
        count = self._scalar(
            """
            SELECT COUNT(DISTINCT billing_document)
            FROM o2c_flow
            WHERE billing_document_type = 'S1'
            """
        )
        rows = self._rows(
            """
            SELECT
                billing_document,
                cancelled_billing_document
            FROM o2c_flow
            WHERE billing_document_type = 'S1'
            GROUP BY 1, 2
            ORDER BY billing_document DESC
            LIMIT 8
            """
        )
        sample_ids = [str(row[0]) for row in rows[:3]]
        return InboxItem(
            id="cancellations",
            title="Cancellation documents",
            summary="Invoices that were reversed through explicit SAP cancellation documents.",
            severity="medium",
            count=count,
            sample_ids=sample_ids,
            focus_node_ids=[f"billing_document:{value}" for value in sample_ids],
            drill_question="Which billing documents are cancelled and what are their cancellation documents?",
        )

    def _orders_without_delivery(self) -> InboxItem:
        count = self._scalar(
            """
            WITH item_status AS (
                SELECT
                    sales_order,
                    sales_order_item,
                    MAX(CASE WHEN delivery_document IS NOT NULL THEN 1 ELSE 0 END) AS has_delivery
                FROM o2c_flow
                GROUP BY 1, 2
            ),
            impacted_orders AS (
                SELECT
                    sales_order
                FROM item_status
                GROUP BY 1
                HAVING SUM(CASE WHEN has_delivery = 0 THEN 1 ELSE 0 END) > 0
            )
            SELECT COUNT(*)
            FROM impacted_orders
            """
        )
        rows = self._rows(
            """
            WITH item_status AS (
                SELECT
                    sales_order,
                    sales_order_item,
                    MAX(CASE WHEN delivery_document IS NOT NULL THEN 1 ELSE 0 END) AS has_delivery
                FROM o2c_flow
                GROUP BY 1, 2
            )
            SELECT
                sales_order,
                SUM(CASE WHEN has_delivery = 0 THEN 1 ELSE 0 END) AS items_without_delivery
            FROM item_status
            GROUP BY 1
            HAVING items_without_delivery > 0
            ORDER BY items_without_delivery DESC, sales_order ASC
            LIMIT 5
            """
        )
        sample_ids = [str(row[0]) for row in rows[:3]]
        return InboxItem(
            id="orders_without_delivery",
            title="Orders missing delivery",
            summary="Sales orders that were created but still have item lines with no delivery document.",
            severity="medium",
            count=count,
            sample_ids=sample_ids,
            focus_node_ids=[f"sales_order:{sales_order}" for sales_order in sample_ids],
            drill_question="Identify sales orders that have broken or incomplete flows.",
        )
