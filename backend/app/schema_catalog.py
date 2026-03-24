ALLOWED_TABLES = {
    "business_partners",
    "business_partner_addresses",
    "customer_company_assignments",
    "customer_sales_area_assignments",
    "sales_order_headers",
    "sales_order_items",
    "sales_order_schedule_lines",
    "outbound_delivery_headers",
    "outbound_delivery_items",
    "billing_document_headers",
    "billing_document_items",
    "billing_document_cancellations",
    "journal_entry_items_accounts_receivable",
    "payments_accounts_receivable",
    "products",
    "product_descriptions",
    "product_plants",
    "product_storage_locations",
    "plants",
    "v_customers",
    "v_products",
    "v_plants",
    "v_sales_orders",
    "v_sales_order_items",
    "v_schedule_line_summary",
    "v_deliveries",
    "v_delivery_items",
    "v_billing_documents",
    "v_billing_items",
    "v_accounting_documents",
    "v_payment_clearances",
    "o2c_flow",
}

SCHEMA_GUIDE = """
You are writing read-only DuckDB SQL for an ERP order-to-cash analytics system.

High-value tables and views:
- o2c_flow: flattened lineage at the sales-order-item grain. It includes sales orders, deliveries, billing documents, accounting documents, product, customer, plant, cancellation, and clearing fields.
- v_sales_orders: header-level order facts.
- v_sales_order_items: order item facts.
- v_deliveries / v_delivery_items: delivery headers and items.
- v_billing_documents / v_billing_items: invoice and cancellation facts.
- v_accounting_documents: AR accounting documents keyed from billing documents.
- v_payment_clearances: clearing/payment documents linked from accounting documents.
- v_customers, v_products, v_plants: master data.

Important modeling notes:
- sales-order items normalize to six digits in the *_item_norm columns.
- delivery items reference sales order items through reference_sd_document + reference_sd_document_item_norm.
- billing items reference delivery items through reference_sd_document + reference_sd_document_item_norm.
- cancellation documents use billing_document_type='S1' and link back through cancelled_billing_document.
- o2c_flow is the safest default table for flow tracing and incomplete-flow analytics.

Important o2c_flow columns:
- sales_order, sales_order_item, sales_order_type
- customer_id, customer_name
- product_id, product_description
- production_plant, delivery_plant
- delivery_document, delivery_item, actual_goods_movement_date
- billing_document, billing_item, billing_document_type, billing_document_is_cancelled, cancelled_billing_document
- billing_document_date, billing_total_net_amount, billing_item_net_amount
- accounting_document, accounting_document_id, posting_date, clearing_date, clearing_accounting_document
- payment_document, payment_document_id

SQL rules:
- Only produce a single SELECT statement.
- Never use INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, COPY, EXPORT, PRAGMA, CALL, or ATTACH.
- Prefer o2c_flow unless the question truly needs another table.
- Add clear aliases and human-readable column names.
- Keep results concise and ordered by relevance.
""".strip()

ANSWER_GUIDE = """
You answer only with evidence grounded in the SQL result set.

Requirements:
- Do not invent facts missing from the result.
- If the result is empty, say so plainly.
- Mention important caveats like cancellations, incomplete flows, or null clearing dates when relevant.
- Be concise, business-facing, and self-explanatory.
- When possible, mention the exact entity ids that support the answer.
- Avoid pasting tables back into the prose answer.
""".strip()

DOMAIN_HINTS = {
    "sales order",
    "sales orders",
    "delivery",
    "deliveries",
    "billing",
    "billing document",
    "invoice",
    "invoices",
    "payment",
    "payments",
    "journal entry",
    "accounting document",
    "customer",
    "customers",
    "product",
    "products",
    "plant",
    "plants",
    "sap",
    "erp",
    "order to cash",
    "o2c",
}

OFF_TOPIC_HINTS = {
    "poem",
    "story",
    "joke",
    "recipe",
    "translate",
    "capital of",
    "weather",
    "movie",
    "president",
    "song",
}
