from __future__ import annotations

import json
from typing import Any

from app.config import get_settings
from app.db import get_connection
from app.models import GraphElement, GraphPayload, NeighborSummary, NodeDetail, SearchResult


def _node_to_element(row: tuple[Any, ...]) -> GraphElement:
    node_id, node_type, label, subtitle, metadata_json = row
    metadata = json.loads(metadata_json) if metadata_json else {}
    return GraphElement(
        data={
            "id": node_id,
            "label": label,
            "nodeType": node_type,
            "subtitle": subtitle,
            "metadata": metadata,
        },
        classes=node_type,
    )


def _edge_to_element(row: tuple[Any, ...]) -> GraphElement:
    edge_id, source_id, target_id, edge_type, label, metadata_json = row
    metadata = json.loads(metadata_json) if metadata_json else {}
    return GraphElement(
        data={
            "id": edge_id,
            "source": source_id,
            "target": target_id,
            "edgeType": edge_type,
            "label": label,
            "metadata": metadata,
        },
        classes=edge_type.lower(),
    )


class GraphService:
    def get_meta_stats(self) -> dict[str, Any]:
        with get_connection() as connection:
            totals_row = connection.execute(
                """
                SELECT
                    (SELECT COUNT(*) FROM graph_nodes) AS graph_nodes,
                    (SELECT COUNT(*) FROM graph_edges) AS graph_edges,
                    (SELECT COUNT(*) FROM sales_order_headers) AS sales_orders,
                    (SELECT COUNT(*) FROM outbound_delivery_headers) AS deliveries,
                    (SELECT COUNT(*) FROM billing_document_headers) AS billing_documents,
                    (SELECT COUNT(*) FROM journal_entry_items_accounts_receivable) AS accounting_documents
                """
            ).fetchone()
            totals = {
                "graph_nodes": totals_row[0],
                "graph_edges": totals_row[1],
                "sales_orders": totals_row[2],
                "deliveries": totals_row[3],
                "billing_documents": totals_row[4],
                "accounting_documents": totals_row[5],
            }
            node_types = {
                row[0]: row[1]
                for row in connection.execute(
                    "SELECT node_type, COUNT(*) FROM graph_nodes GROUP BY 1 ORDER BY 2 DESC"
                ).fetchall()
            }
        return {"totals": totals, "node_types": node_types}

    def initial_graph(self) -> GraphPayload:
        with get_connection() as connection:
            rows = connection.execute(
                """
                SELECT sales_order, delivery_document, billing_document, accounting_document_id, product_id, customer_id
                FROM o2c_flow
                WHERE billing_document IS NOT NULL
                ORDER BY sales_order
                LIMIT ?
                """,
                [get_settings().initial_flow_limit],
            ).fetchall()

        seed_nodes = []
        for sales_order, delivery_document, billing_document, accounting_document_id, product_id, customer_id in rows:
            seed_nodes.extend(
                [
                    f"sales_order:{sales_order}",
                    f"delivery:{delivery_document}" if delivery_document else None,
                    f"billing_document:{billing_document}" if billing_document else None,
                    f"accounting_document:{accounting_document_id}" if accounting_document_id else None,
                    f"product:{product_id}" if product_id else None,
                    f"customer:{customer_id}" if customer_id else None,
                ]
            )
        deduped_seed_nodes = list(dict.fromkeys(node_id for node_id in seed_nodes if node_id))
        return self.subgraph(deduped_seed_nodes, depth=1, limit=72)

    def search(self, query: str, limit: int = 10) -> list[SearchResult]:
        normalized = f"%{query.lower()}%"
        with get_connection() as connection:
            rows = connection.execute(
                """
                SELECT
                    node_id,
                    node_type,
                    label,
                    subtitle,
                    CASE
                        WHEN LOWER(node_id) = ? THEN 1.0
                        WHEN LOWER(label) LIKE ? THEN 0.95
                        WHEN LOWER(search_text) LIKE ? THEN 0.8
                        ELSE 0.5
                    END AS score
                FROM graph_nodes
                WHERE LOWER(search_text) LIKE ?
                ORDER BY score DESC, label ASC
                LIMIT ?
                """,
                [query.lower(), normalized, normalized, normalized, limit],
            ).fetchall()

        return [
            SearchResult(
                node_id=row[0],
                node_type=row[1],
                label=row[2],
                subtitle=row[3],
                score=row[4],
            )
            for row in rows
        ]

    def node_detail(self, node_id: str) -> NodeDetail:
        with get_connection() as connection:
            node_row = connection.execute(
                """
                SELECT node_id, node_type, label, subtitle, metadata_json
                FROM graph_nodes
                WHERE node_id = ?
                """,
                [node_id],
            ).fetchone()
            if node_row is None:
                raise KeyError(node_id)

            neighbor_rows = connection.execute(
                """
                SELECT edge_type, 'outgoing' AS direction, COUNT(*)
                FROM graph_edges
                WHERE source_id = ?
                GROUP BY 1, 2
                UNION ALL
                SELECT edge_type, 'incoming' AS direction, COUNT(*)
                FROM graph_edges
                WHERE target_id = ?
                GROUP BY 1, 2
                ORDER BY 3 DESC, 1 ASC
                """,
                [node_id, node_id],
            ).fetchall()

        return NodeDetail(
            node_id=node_row[0],
            node_type=node_row[1],
            label=node_row[2],
            subtitle=node_row[3],
            metadata=json.loads(node_row[4]) if node_row[4] else {},
            neighbors=[
                NeighborSummary(edge_type=row[0], direction=row[1], count=row[2])
                for row in neighbor_rows
            ],
        )

    def subgraph(self, node_ids: list[str], depth: int = 1, limit: int | None = None) -> GraphPayload:
        if not node_ids:
            return GraphPayload(nodes=[], edges=[], focus_node_ids=[])

        max_edges = limit or get_settings().graph_neighbor_limit
        frontier = {node_id for node_id in node_ids if node_id}
        visited = set(frontier)
        edge_ids: set[str] = set()

        with get_connection() as connection:
            for _ in range(max(depth, 1)):
                if not frontier:
                    break
                placeholders = ", ".join("?" for _ in frontier)
                rows = connection.execute(
                    f"""
                    SELECT edge_id, source_id, target_id
                    FROM graph_edges
                    WHERE source_id IN ({placeholders}) OR target_id IN ({placeholders})
                    LIMIT ?
                    """,
                    [*frontier, *frontier, max_edges],
                ).fetchall()

                next_frontier: set[str] = set()
                for edge_id, source_id, target_id in rows:
                    edge_ids.add(edge_id)
                    if source_id not in visited:
                        next_frontier.add(source_id)
                    if target_id not in visited:
                        next_frontier.add(target_id)

                visited.update(next_frontier)
                frontier = next_frontier

            node_placeholders = ", ".join("?" for _ in visited)
            edge_placeholders = ", ".join("?" for _ in edge_ids) if edge_ids else ""
            node_rows = connection.execute(
                f"""
                SELECT node_id, node_type, label, subtitle, metadata_json
                FROM graph_nodes
                WHERE node_id IN ({node_placeholders})
                ORDER BY label
                """,
                [*visited],
            ).fetchall()

            edge_rows = []
            if edge_ids:
                edge_rows = connection.execute(
                    f"""
                    SELECT edge_id, source_id, target_id, edge_type, label, metadata_json
                    FROM graph_edges
                    WHERE edge_id IN ({edge_placeholders})
                    ORDER BY edge_type, edge_id
                    """,
                    [*edge_ids],
                ).fetchall()

        return GraphPayload(
            nodes=[_node_to_element(row) for row in node_rows],
            edges=[_edge_to_element(row) for row in edge_rows],
            focus_node_ids=[node_id for node_id in node_ids if node_id in visited],
        )

    def infer_focus_nodes(self, columns: list[str], rows: list[list[Any]]) -> list[str]:
        focus: list[str] = []
        type_map = {
            "sales_order": "sales_order",
            "delivery_document": "delivery",
            "billing_document": "billing_document",
            "accounting_document": "accounting_document",
            "accounting_document_id": "accounting_document",
            "payment_document": "payment_document",
            "payment_document_id": "payment_document",
            "customer_id": "customer",
            "product_id": "product",
            "plant": "plant",
            "delivery_plant_name": "plant",
            "production_plant_name": "plant",
            "delivery_plant": "plant",
            "production_plant": "plant",
        }
        for row in rows[:15]:
            for column, value in zip(columns, row, strict=False):
                if value in (None, ""):
                    continue
                node_type = type_map.get(column)
                if node_type:
                    focus.append(f"{node_type}:{value}")
        deduped: dict[str, None] = {}
        for node_id in focus:
            deduped.setdefault(node_id, None)
        return list(deduped.keys())[:8]
