from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import duckdb
import pandas as pd


SOURCE_FOLDERS = [
    "billing_document_cancellations",
    "billing_document_headers",
    "billing_document_items",
    "business_partner_addresses",
    "business_partners",
    "customer_company_assignments",
    "customer_sales_area_assignments",
    "journal_entry_items_accounts_receivable",
    "outbound_delivery_headers",
    "outbound_delivery_items",
    "payments_accounts_receivable",
    "plants",
    "product_descriptions",
    "product_plants",
    "product_storage_locations",
    "products",
    "sales_order_headers",
    "sales_order_items",
    "sales_order_schedule_lines",
]


def snake_case(name: str) -> str:
    normalized = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", name)
    normalized = normalized.replace(".", "_").replace("-", "_").replace("/", "_")
    normalized = re.sub(r"[^a-zA-Z0-9_]+", "_", normalized)
    normalized = re.sub(r"_+", "_", normalized).strip("_")
    return normalized.lower()


def flatten_record(record: dict[str, Any], prefix: str = "") -> dict[str, Any]:
    flattened: dict[str, Any] = {}
    for key, value in record.items():
        full_key = f"{prefix}_{key}" if prefix else key
        if isinstance(value, dict):
            flattened.update(flatten_record(value, full_key))
        elif isinstance(value, list):
            flattened[snake_case(full_key)] = json.dumps(value, ensure_ascii=False)
        else:
            flattened[snake_case(full_key)] = value
    return flattened


def load_folder(folder_path: Path) -> pd.DataFrame:
    rows: list[dict[str, Any]] = []
    for file_path in sorted(folder_path.glob("*.jsonl")):
        with file_path.open("r", encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                rows.append(flatten_record(json.loads(line)))
    return pd.DataFrame(rows)


SEMANTIC_SQL = """
CREATE OR REPLACE VIEW v_customers AS
SELECT
    bp.customer AS customer_id,
    bp.business_partner AS business_partner_id,
    COALESCE(bp.business_partner_name, bp.business_partner_full_name, bp.organization_bp_name1, bp.customer) AS customer_name,
    bp.industry,
    bp.business_partner_category,
    bp.creation_date,
    bpa.address_id,
    bpa.city_name,
    bpa.region,
    bpa.country,
    bpa.postal_code,
    bpa.street_name
FROM business_partners bp
LEFT JOIN business_partner_addresses bpa
    ON bp.business_partner = bpa.business_partner;

CREATE OR REPLACE VIEW v_products AS
SELECT
    p.product,
    COALESCE(pd.product_description, p.product) AS product_description,
    p.product_type,
    p.product_group,
    p.base_unit,
    p.division,
    p.gross_weight,
    p.net_weight,
    p.weight_unit
FROM products p
LEFT JOIN product_descriptions pd
    ON p.product = pd.product
   AND pd.language = 'EN';

CREATE OR REPLACE VIEW v_plants AS
SELECT
    plant,
    plant_name,
    sales_organization,
    distribution_channel,
    division,
    address_id,
    valuation_area
FROM plants;

CREATE OR REPLACE VIEW v_sales_orders AS
SELECT
    sales_order,
    sales_order_type,
    sold_to_party AS customer_id,
    sales_organization,
    distribution_channel,
    organization_division,
    overall_delivery_status,
    overall_ord_reltd_billg_status,
    total_net_amount,
    transaction_currency,
    requested_delivery_date,
    creation_date,
    pricing_date,
    last_change_date_time
FROM sales_order_headers;

CREATE OR REPLACE VIEW v_sales_order_items AS
SELECT
    sales_order,
    LPAD(CAST(sales_order_item AS VARCHAR), 6, '0') AS sales_order_item_norm,
    sales_order || ':' || LPAD(CAST(sales_order_item AS VARCHAR), 6, '0') AS sales_order_item_id,
    sales_order_item,
    material AS product_id,
    requested_quantity,
    requested_quantity_unit,
    net_amount,
    transaction_currency,
    production_plant,
    storage_location,
    material_group,
    sales_order_item_category
FROM sales_order_items;

CREATE OR REPLACE VIEW v_schedule_line_summary AS
SELECT
    sales_order,
    LPAD(CAST(sales_order_item AS VARCHAR), 6, '0') AS sales_order_item_norm,
    sales_order || ':' || LPAD(CAST(sales_order_item AS VARCHAR), 6, '0') || ':schedule' AS schedule_summary_id,
    COUNT(*) AS schedule_line_count,
    MIN(confirmed_delivery_date) AS first_confirmed_delivery_date,
    MAX(confirmed_delivery_date) AS last_confirmed_delivery_date,
    SUM(TRY_CAST(confd_order_qty_by_matl_avail_check AS DOUBLE)) AS total_confirmed_quantity
FROM sales_order_schedule_lines
GROUP BY 1, 2, 3;

CREATE OR REPLACE VIEW v_deliveries AS
SELECT
    delivery_document,
    actual_goods_movement_date,
    creation_date,
    overall_goods_movement_status,
    overall_picking_status,
    hdr_general_incompletion_status,
    shipping_point
FROM outbound_delivery_headers;

CREATE OR REPLACE VIEW v_delivery_items AS
SELECT
    delivery_document,
    LPAD(CAST(delivery_document_item AS VARCHAR), 6, '0') AS delivery_document_item_norm,
    delivery_document || ':' || LPAD(CAST(delivery_document_item AS VARCHAR), 6, '0') AS delivery_item_id,
    reference_sd_document AS sales_order,
    LPAD(CAST(reference_sd_document_item AS VARCHAR), 6, '0') AS reference_sd_document_item_norm,
    actual_delivery_quantity,
    delivery_quantity_unit,
    plant,
    storage_location
FROM outbound_delivery_items;

CREATE OR REPLACE VIEW v_billing_documents AS
SELECT
    billing_document,
    billing_document_type,
    billing_document_is_cancelled,
    cancelled_billing_document,
    sold_to_party AS customer_id,
    total_net_amount,
    transaction_currency,
    accounting_document,
    company_code,
    fiscal_year,
    billing_document_date,
    creation_date,
    last_change_date_time
FROM billing_document_headers;

CREATE OR REPLACE VIEW v_billing_items AS
SELECT
    billing_document,
    billing_document || ':' || LPAD(CAST(billing_document_item AS VARCHAR), 6, '0') AS billing_item_id,
    LPAD(CAST(billing_document_item AS VARCHAR), 6, '0') AS billing_document_item_norm,
    material AS product_id,
    TRY_CAST(net_amount AS DOUBLE) AS net_amount,
    TRY_CAST(billing_quantity AS DOUBLE) AS billing_quantity,
    billing_quantity_unit,
    reference_sd_document AS delivery_document,
    LPAD(CAST(reference_sd_document_item AS VARCHAR), 6, '0') AS reference_sd_document_item_norm,
    transaction_currency
FROM billing_document_items;

CREATE OR REPLACE VIEW v_accounting_documents AS
SELECT
    company_code,
    fiscal_year,
    accounting_document,
    company_code || ':' || fiscal_year || ':' || accounting_document AS accounting_document_id,
    reference_document AS billing_document,
    customer AS customer_id,
    document_date,
    posting_date,
    clearing_date,
    clearing_accounting_document,
    clearing_doc_fiscal_year,
    amount_in_transaction_currency,
    transaction_currency
FROM journal_entry_items_accounts_receivable;

CREATE OR REPLACE VIEW v_payment_clearances AS
SELECT DISTINCT
    company_code,
    COALESCE(clearing_doc_fiscal_year, fiscal_year) AS payment_fiscal_year,
    clearing_accounting_document AS payment_document,
    company_code || ':' || COALESCE(clearing_doc_fiscal_year, fiscal_year) || ':' || clearing_accounting_document AS payment_document_id,
    company_code || ':' || fiscal_year || ':' || accounting_document AS accounting_document_id,
    customer AS customer_id,
    clearing_date,
    amount_in_transaction_currency,
    transaction_currency
FROM payments_accounts_receivable
WHERE clearing_accounting_document IS NOT NULL
  AND clearing_accounting_document <> '';

CREATE OR REPLACE VIEW o2c_flow AS
SELECT
    so.sales_order,
    so.sales_order_type,
    so.customer_id,
    c.customer_name,
    soi.sales_order_item_norm AS sales_order_item,
    soi.product_id,
    p.product_description,
    soi.production_plant,
    soi.storage_location AS sales_order_storage_location,
    sl.first_confirmed_delivery_date,
    sl.total_confirmed_quantity,
    di.delivery_document,
    di.delivery_document_item_norm AS delivery_item,
    d.overall_goods_movement_status,
    d.actual_goods_movement_date,
    di.plant AS delivery_plant,
    di.storage_location AS delivery_storage_location,
    bi.billing_document,
    bi.billing_document_item_norm AS billing_item,
    bd.billing_document_type,
    bd.billing_document_is_cancelled,
    bd.cancelled_billing_document,
    bd.total_net_amount AS billing_total_net_amount,
    bi.net_amount AS billing_item_net_amount,
    bd.billing_document_date,
    ad.accounting_document,
    ad.accounting_document_id,
    ad.posting_date,
    ad.clearing_date,
    ad.clearing_accounting_document,
    pc.payment_document,
    pc.payment_document_id
FROM v_sales_order_items soi
JOIN v_sales_orders so
  ON so.sales_order = soi.sales_order
LEFT JOIN v_customers c
  ON c.customer_id = so.customer_id
LEFT JOIN v_products p
  ON p.product = soi.product_id
LEFT JOIN v_schedule_line_summary sl
  ON sl.sales_order = soi.sales_order
 AND sl.sales_order_item_norm = soi.sales_order_item_norm
LEFT JOIN v_delivery_items di
  ON di.sales_order = soi.sales_order
 AND di.reference_sd_document_item_norm = soi.sales_order_item_norm
LEFT JOIN v_deliveries d
  ON d.delivery_document = di.delivery_document
LEFT JOIN v_billing_items bi
  ON bi.delivery_document = di.delivery_document
 AND bi.reference_sd_document_item_norm = di.delivery_document_item_norm
LEFT JOIN v_billing_documents bd
  ON bd.billing_document = bi.billing_document
LEFT JOIN v_accounting_documents ad
  ON ad.billing_document = bd.billing_document
LEFT JOIN v_payment_clearances pc
  ON pc.accounting_document_id = ad.accounting_document_id;
"""


def _graph_node(node_id: str, node_type: str, label: str, subtitle: str | None, metadata: dict[str, Any]) -> dict[str, Any]:
    return {
        "node_id": node_id,
        "node_type": node_type,
        "label": label,
        "subtitle": subtitle or "",
        "search_text": " ".join(
            str(value)
            for value in [node_id, node_type, label, subtitle, *metadata.values()]
            if value not in (None, "")
        ).lower(),
        "metadata_json": json.dumps(metadata, ensure_ascii=False, default=str),
    }


def _graph_edge(edge_id: str, source_id: str, target_id: str, edge_type: str, label: str, metadata: dict[str, Any] | None = None) -> dict[str, Any]:
    return {
        "edge_id": edge_id,
        "source_id": source_id,
        "target_id": target_id,
        "edge_type": edge_type,
        "label": label,
        "metadata_json": json.dumps(metadata or {}, ensure_ascii=False, default=str),
    }


def build_graph_tables(connection: duckdb.DuckDBPyConnection) -> None:
    nodes: dict[str, dict[str, Any]] = {}
    edges: dict[str, dict[str, Any]] = {}

    def add_node(payload: dict[str, Any]) -> None:
        nodes[payload["node_id"]] = payload

    def add_edge(payload: dict[str, Any]) -> None:
        edges[payload["edge_id"]] = payload

    customer_rows = connection.execute("SELECT * FROM v_customers").fetchall()
    for row in customer_rows:
        customer_id, business_partner_id, customer_name, industry, category, creation_date, address_id, city_name, region, country, postal_code, street_name = row
        if customer_id is None:
            continue
        add_node(
            _graph_node(
                f"customer:{customer_id}",
                "customer",
                customer_name or customer_id,
                f"Customer {customer_id}",
                {
                    "customer_id": customer_id,
                    "business_partner_id": business_partner_id,
                    "industry": industry,
                    "category": category,
                    "creation_date": creation_date,
                    "city_name": city_name,
                    "region": region,
                    "country": country,
                    "postal_code": postal_code,
                    "street_name": street_name,
                },
            )
        )
        if address_id:
            address_node_id = f"address:{address_id}"
            add_node(
                _graph_node(
                    address_node_id,
                    "address",
                    ", ".join(part for part in [city_name, region, country] if part) or address_id,
                    f"Address {address_id}",
                    {
                        "address_id": address_id,
                        "city_name": city_name,
                        "region": region,
                        "country": country,
                        "postal_code": postal_code,
                        "street_name": street_name,
                    },
                )
            )
            add_edge(
                _graph_edge(
                    f"customer:{customer_id}->address:{address_id}",
                    f"customer:{customer_id}",
                    address_node_id,
                    "HAS_ADDRESS",
                    "Has address",
                )
            )

    product_rows = connection.execute("SELECT * FROM v_products").fetchall()
    for row in product_rows:
        product, description, product_type, product_group, base_unit, division, gross_weight, net_weight, weight_unit = row
        add_node(
            _graph_node(
                f"product:{product}",
                "product",
                description or product,
                product,
                {
                    "product_id": product,
                    "product_type": product_type,
                    "product_group": product_group,
                    "base_unit": base_unit,
                    "division": division,
                    "gross_weight": gross_weight,
                    "net_weight": net_weight,
                    "weight_unit": weight_unit,
                },
            )
        )

    plant_rows = connection.execute("SELECT * FROM v_plants").fetchall()
    for row in plant_rows:
        plant, plant_name, sales_org, channel, division, address_id, valuation_area = row
        add_node(
            _graph_node(
                f"plant:{plant}",
                "plant",
                plant_name or plant,
                plant,
                {
                    "plant": plant,
                    "sales_organization": sales_org,
                    "distribution_channel": channel,
                    "division": division,
                    "address_id": address_id,
                    "valuation_area": valuation_area,
                },
            )
        )

    order_rows = connection.execute("SELECT * FROM v_sales_orders").fetchall()
    for row in order_rows:
        sales_order, sales_order_type, customer_id, sales_org, channel, division, overall_delivery_status, overall_billing_status, total_net_amount, currency, requested_delivery_date, creation_date, pricing_date, last_change = row
        order_node_id = f"sales_order:{sales_order}"
        add_node(
            _graph_node(
                order_node_id,
                "sales_order",
                sales_order,
                f"{sales_order_type} order",
                {
                    "sales_order": sales_order,
                    "sales_order_type": sales_order_type,
                    "customer_id": customer_id,
                    "sales_organization": sales_org,
                    "distribution_channel": channel,
                    "division": division,
                    "overall_delivery_status": overall_delivery_status,
                    "overall_billing_status": overall_billing_status,
                    "total_net_amount": total_net_amount,
                    "currency": currency,
                    "requested_delivery_date": requested_delivery_date,
                    "creation_date": creation_date,
                    "pricing_date": pricing_date,
                    "last_change": last_change,
                },
            )
        )
        if customer_id:
            add_edge(
                _graph_edge(
                    f"customer:{customer_id}->sales_order:{sales_order}",
                    f"customer:{customer_id}",
                    order_node_id,
                    "PLACED_ORDER",
                    "Placed order",
                )
            )

    item_rows = connection.execute("SELECT * FROM v_sales_order_items").fetchall()
    for row in item_rows:
        sales_order, item_norm, item_id, item_raw, product_id, requested_quantity, requested_unit, net_amount, currency, production_plant, storage_location, material_group, item_category = row
        item_node_id = f"sales_order_item:{item_id}"
        add_node(
            _graph_node(
                item_node_id,
                "sales_order_item",
                item_norm,
                f"Item on {sales_order}",
                {
                    "sales_order": sales_order,
                    "sales_order_item": item_raw,
                    "sales_order_item_norm": item_norm,
                    "product_id": product_id,
                    "requested_quantity": requested_quantity,
                    "requested_unit": requested_unit,
                    "net_amount": net_amount,
                    "currency": currency,
                    "production_plant": production_plant,
                    "storage_location": storage_location,
                    "material_group": material_group,
                    "item_category": item_category,
                },
            )
        )
        add_edge(
            _graph_edge(
                f"sales_order:{sales_order}->{item_node_id}",
                f"sales_order:{sales_order}",
                item_node_id,
                "HAS_ITEM",
                "Has item",
            )
        )
        if product_id:
            add_edge(
                _graph_edge(
                    f"{item_node_id}->product:{product_id}",
                    item_node_id,
                    f"product:{product_id}",
                    "REQUESTS_PRODUCT",
                    "Requests product",
                )
            )
        if production_plant:
            add_edge(
                _graph_edge(
                    f"{item_node_id}->plant:{production_plant}",
                    item_node_id,
                    f"plant:{production_plant}",
                    "FULFILLED_BY_PLANT",
                    "Fulfilled by plant",
                )
            )

    schedule_rows = connection.execute("SELECT * FROM v_schedule_line_summary").fetchall()
    for row in schedule_rows:
        sales_order, item_norm, _schedule_summary_id, schedule_count, first_confirmed, last_confirmed, total_confirmed = row
        item_node_id = f"sales_order_item:{sales_order}:{item_norm}"
        summary_node_id = f"schedule_summary:{sales_order}:{item_norm}"
        add_node(
            _graph_node(
                summary_node_id,
                "schedule_summary",
                f"{schedule_count} schedule lines",
                f"{sales_order}/{item_norm}",
                {
                    "sales_order": sales_order,
                    "sales_order_item": item_norm,
                    "schedule_line_count": schedule_count,
                    "first_confirmed_delivery_date": first_confirmed,
                    "last_confirmed_delivery_date": last_confirmed,
                    "total_confirmed_quantity": total_confirmed,
                },
            )
        )

    delivery_rows = connection.execute("SELECT * FROM v_deliveries").fetchall()
    for row in delivery_rows:
        delivery_document, goods_movement_date, creation_date, goods_status, picking_status, incompletion_status, shipping_point = row
        delivery_node_id = f"delivery:{delivery_document}"
        add_node(
            _graph_node(
                delivery_node_id,
                "delivery",
                delivery_document,
                "Outbound delivery",
                {
                    "delivery_document": delivery_document,
                    "actual_goods_movement_date": goods_movement_date,
                    "creation_date": creation_date,
                    "overall_goods_movement_status": goods_status,
                    "overall_picking_status": picking_status,
                    "incompletion_status": incompletion_status,
                    "shipping_point": shipping_point,
                },
            )
        )

    delivery_item_rows = connection.execute("SELECT * FROM v_delivery_items").fetchall()
    for row in delivery_item_rows:
        delivery_document, item_norm, item_id, sales_order, ref_item_norm, actual_qty, qty_unit, plant, storage_location = row
        delivery_node_id = f"delivery:{delivery_document}"
        delivery_item_node_id = f"delivery_item:{item_id}"
        add_node(
            _graph_node(
                delivery_item_node_id,
                "delivery_item",
                item_norm,
                f"Item on {delivery_document}",
                {
                    "delivery_document": delivery_document,
                    "delivery_item": item_norm,
                    "sales_order": sales_order,
                    "sales_order_item": ref_item_norm,
                    "actual_delivery_quantity": actual_qty,
                    "delivery_quantity_unit": qty_unit,
                    "plant": plant,
                    "storage_location": storage_location,
                },
            )
        )
        add_edge(
            _graph_edge(
                f"{delivery_node_id}->{delivery_item_node_id}",
                delivery_node_id,
                delivery_item_node_id,
                "HAS_ITEM",
                "Has item",
            )
        )
        add_edge(
            _graph_edge(
                f"sales_order_item:{sales_order}:{ref_item_norm}->{delivery_item_node_id}",
                f"sales_order_item:{sales_order}:{ref_item_norm}",
                delivery_item_node_id,
                "FULFILLED_AS",
                "Fulfilled as delivery item",
            )
        )
        if plant:
            add_edge(
                _graph_edge(
                    f"{delivery_item_node_id}->plant:{plant}",
                    delivery_item_node_id,
                    f"plant:{plant}",
                    "SHIPPED_FROM",
                    "Shipped from",
                )
            )

    billing_rows = connection.execute("SELECT * FROM v_billing_documents").fetchall()
    for row in billing_rows:
        billing_document, doc_type, is_cancelled, cancelled_billing_document, customer_id, total_net_amount, currency, accounting_document, company_code, fiscal_year, billing_date, creation_date, last_change = row
        billing_node_id = f"billing_document:{billing_document}"
        add_node(
            _graph_node(
                billing_node_id,
                "billing_document",
                billing_document,
                f"{doc_type} billing document",
                {
                    "billing_document": billing_document,
                    "billing_document_type": doc_type,
                    "billing_document_is_cancelled": is_cancelled,
                    "cancelled_billing_document": cancelled_billing_document,
                    "customer_id": customer_id,
                    "total_net_amount": total_net_amount,
                    "currency": currency,
                    "accounting_document": accounting_document,
                    "company_code": company_code,
                    "fiscal_year": fiscal_year,
                    "billing_document_date": billing_date,
                    "creation_date": creation_date,
                    "last_change": last_change,
                },
            )
        )
        if customer_id:
            add_edge(
                _graph_edge(
                    f"customer:{customer_id}->{billing_node_id}",
                    f"customer:{customer_id}",
                    billing_node_id,
                    "BILLED_TO",
                    "Billed to",
                )
            )
        if cancelled_billing_document:
            add_edge(
                _graph_edge(
                    f"{billing_node_id}->billing_document:{cancelled_billing_document}",
                    billing_node_id,
                    f"billing_document:{cancelled_billing_document}",
                    "CANCELS",
                    "Cancels",
                )
            )

    billing_item_rows = connection.execute("SELECT * FROM v_billing_items").fetchall()
    for row in billing_item_rows:
        billing_document, item_id, item_norm, product_id, net_amount, billing_quantity, unit, delivery_document, delivery_item_norm, currency = row
        billing_node_id = f"billing_document:{billing_document}"
        billing_item_node_id = f"billing_item:{item_id}"
        add_node(
            _graph_node(
                billing_item_node_id,
                "billing_item",
                item_norm,
                f"Item on {billing_document}",
                {
                    "billing_document": billing_document,
                    "billing_item": item_norm,
                    "product_id": product_id,
                    "net_amount": net_amount,
                    "billing_quantity": billing_quantity,
                    "billing_quantity_unit": unit,
                    "delivery_document": delivery_document,
                    "delivery_item": delivery_item_norm,
                    "currency": currency,
                },
            )
        )
        add_edge(
            _graph_edge(
                f"{billing_node_id}->{billing_item_node_id}",
                billing_node_id,
                billing_item_node_id,
                "HAS_ITEM",
                "Has item",
            )
        )
        if delivery_document:
            add_edge(
                _graph_edge(
                    f"delivery_item:{delivery_document}:{delivery_item_norm}->{billing_item_node_id}",
                    f"delivery_item:{delivery_document}:{delivery_item_norm}",
                    billing_item_node_id,
                    "INVOICED_AS",
                    "Invoiced as",
                )
            )
        if product_id:
            add_edge(
                _graph_edge(
                    f"{billing_item_node_id}->product:{product_id}",
                    billing_item_node_id,
                    f"product:{product_id}",
                    "BILLS_PRODUCT",
                    "Bills product",
                )
            )

    accounting_rows = connection.execute("SELECT * FROM v_accounting_documents").fetchall()
    for row in accounting_rows:
        company_code, fiscal_year, accounting_document, accounting_document_id, billing_document, customer_id, document_date, posting_date, clearing_date, clearing_accounting_document, clearing_doc_fiscal_year, amount, currency = row
        account_node_id = f"accounting_document:{accounting_document_id}"
        add_node(
            _graph_node(
                account_node_id,
                "accounting_document",
                accounting_document,
                "Accounts receivable document",
                {
                    "company_code": company_code,
                    "fiscal_year": fiscal_year,
                    "accounting_document": accounting_document,
                    "billing_document": billing_document,
                    "customer_id": customer_id,
                    "document_date": document_date,
                    "posting_date": posting_date,
                    "clearing_date": clearing_date,
                    "clearing_accounting_document": clearing_accounting_document,
                    "clearing_doc_fiscal_year": clearing_doc_fiscal_year,
                    "amount_in_transaction_currency": amount,
                    "currency": currency,
                },
            )
        )
        if billing_document:
            add_edge(
                _graph_edge(
                    f"billing_document:{billing_document}->{account_node_id}",
                    f"billing_document:{billing_document}",
                    account_node_id,
                    "POSTED_TO_AR",
                    "Posted to A/R",
                )
            )

    payment_rows = connection.execute("SELECT * FROM v_payment_clearances").fetchall()
    for row in payment_rows:
        company_code, payment_fiscal_year, payment_document, payment_document_id, accounting_document_id, customer_id, clearing_date, amount, currency = row
        payment_node_id = f"payment_document:{payment_document_id}"
        add_node(
            _graph_node(
                payment_node_id,
                "payment_document",
                payment_document,
                "Clearing document",
                {
                    "company_code": company_code,
                    "payment_fiscal_year": payment_fiscal_year,
                    "payment_document": payment_document,
                    "customer_id": customer_id,
                    "clearing_date": clearing_date,
                    "amount_in_transaction_currency": amount,
                    "currency": currency,
                },
            )
        )
        add_edge(
            _graph_edge(
                f"accounting_document:{accounting_document_id}->{payment_node_id}",
                f"accounting_document:{accounting_document_id}",
                payment_node_id,
                "CLEARED_BY",
                "Cleared by",
            )
        )

    nodes_df = pd.DataFrame(sorted(nodes.values(), key=lambda item: item["node_id"]))
    edges_df = pd.DataFrame(sorted(edges.values(), key=lambda item: item["edge_id"]))
    connection.register("graph_nodes_df", nodes_df)
    connection.register("graph_edges_df", edges_df)
    connection.execute("CREATE OR REPLACE TABLE graph_nodes AS SELECT * FROM graph_nodes_df")
    connection.execute("CREATE OR REPLACE TABLE graph_edges AS SELECT * FROM graph_edges_df")
    connection.unregister("graph_nodes_df")
    connection.unregister("graph_edges_df")


def build_database(connection: duckdb.DuckDBPyConnection, dataset_root: Path) -> None:
    if not dataset_root.exists():
        raise FileNotFoundError(f"Dataset directory not found: {dataset_root}")

    for folder_name in SOURCE_FOLDERS:
        table_name = snake_case(folder_name)
        frame = load_folder(dataset_root / folder_name)
        connection.register(f"{table_name}_df", frame)
        connection.execute(f"CREATE OR REPLACE TABLE {table_name} AS SELECT * FROM {table_name}_df")
        connection.unregister(f"{table_name}_df")

    connection.execute(SEMANTIC_SQL)
    build_graph_tables(connection)
    connection.execute(
        """
        CREATE OR REPLACE TABLE app_metadata AS
        SELECT
            NOW() AS built_at,
            (SELECT COUNT(*) FROM graph_nodes) AS graph_node_count,
            (SELECT COUNT(*) FROM graph_edges) AS graph_edge_count,
            (SELECT COUNT(*) FROM o2c_flow) AS flow_row_count
        """
    )
