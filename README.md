# Order-to-Cash Intelligence Copilot

A full-stack submission for the Dodge AI Forward Deployed Engineer take-home. The app ingests the provided SAP order-to-cash dataset, constructs a context graph over the business entities, visualizes relationships in the browser, and answers natural-language questions with grounded DuckDB SQL and Gemini-backed fallback planning.

## Live Demo

- Demo: `https://dodge-ai-o2c-graph-copilot.onrender.com`
- Repository: `https://github.com/Kenxpx/dodge-ai-fde-o2c-graph-copilot`

## What It Does

- Builds a graph over customers, addresses, sales orders, order items, schedule summaries, deliveries, delivery items, billing documents, billing items, accounting documents, payment clearances, products, and plants.
- Normalizes the tricky ERP join paths:
  - `sales_order_item -> delivery_item -> billing_item`
  - cancellation documents through `billing_document_type = 'S1'` and `cancelled_billing_document`
  - AR clearing through `accounting_document_id -> payment_document_id`
- Exposes graph APIs for initial exploration, node search, node inspection, and neighborhood expansion.
- Supports grounded chat with:
  - deterministic query templates for the assignment's core questions
  - Gemini-based NL-to-SQL planning for broader in-domain questions
  - SQL validation and read-only guardrails
  - concise business summaries, evidence preview, and executed SQL in the UI

## Architecture

### Backend

- **FastAPI** for the API layer and app lifecycle.
- **DuckDB** as the analytical store.
  - Reason for choosing DuckDB:
    - excellent fit for local analytics and read-heavy SQL
    - zero external infrastructure
    - fast enough to rebuild the full semantic layer on startup
    - ideal for grounded LLM answers because the final execution target is SQL
- **Semantic views** over the raw JSONL tables:
  - `v_sales_orders`
  - `v_sales_order_items`
  - `v_deliveries`
  - `v_delivery_items`
  - `v_billing_documents`
  - `v_billing_items`
  - `v_accounting_documents`
  - `v_payment_clearances`
  - `v_customers`
  - `v_products`
  - `v_plants`
  - `o2c_flow`

### Why `o2c_flow`

The key modeling decision is the flattened `o2c_flow` view at the sales-order-item grain. It keeps the system simple and evaluator-friendly:

- most business questions can be answered from one grounded table
- incomplete flow detection becomes straightforward
- tracing from invoice to order or payment becomes easy
- the LLM has fewer joins to reason about, which lowers hallucination risk

### Graph Model

The graph is materialized into:

- `graph_nodes`
- `graph_edges`

Each node stores:

- `node_id`
- `node_type`
- `label`
- `subtitle`
- `metadata_json`
- `search_text`

Each edge stores:

- `source_id`
- `target_id`
- `edge_type`
- `label`
- `metadata_json`

This gives us a real graph experience in the UI without forcing the core query engine into a graph database. The graph and the SQL layer share the same semantic model instead of drifting apart.

## LLM Strategy

The query engine uses a hybrid strategy.

### 1. Deterministic first

For the assignment's highest-signal questions, the app prefers deterministic SQL templates:

- top products by billing-document count
- top customers by billing-document count
- full billing-document flow trace
- incomplete or broken flows
- cancellation analysis
- open A/R items not cleared by payment

This keeps the demo strong even without an LLM provider.

### 2. LLM fallback for open-ended domain questions

If the question is in-domain but not covered by a built-in template, the app can call:

- **Gemini** via the official Google Generative Language API
- **OpenAI-compatible** endpoints such as OpenRouter or Groq

The LLM receives:

- a tight schema guide
- explicit SQL constraints
- domain-specific modeling notes
- a requirement to emit one read-only DuckDB `SELECT`

### 3. SQL validation

All LLM-generated SQL is validated with `sqlglot`:

- disallows write operations
- disallows non-approved tables
- strips markdown fences
- enforces a row limit

### 4. Answer synthesis

Answers are always grounded in the SQL result set. The UI also surfaces:

- executed SQL
- evidence rows
- warnings or caveats

## Guardrails

The system rejects off-domain prompts before query generation.

Current guardrails include:

- domain keyword and identifier checks
- rejection of clearly unrelated prompts such as creative writing or general knowledge
- SQL validation against a strict allowlist
- read-only execution only

The rejection message is intentionally simple:

> This system is designed to answer questions related to the provided SAP order-to-cash dataset only.

## Frontend

- **React + Vite + TypeScript**
- **Cytoscape.js** for graph rendering

The UI has three working surfaces:

- **Grounded chat** for natural-language questions
- **Context graph** for relationship exploration
- **Node inspector** for metadata and neighborhood summary

The visual design deliberately avoids generic dashboard defaults. It uses a warm operations-focused palette and emphasizes graph context over decorative chrome.

## Project Structure

```text
backend/
  app/
    api/
    llm/
    services/
  scripts/
  tests/
docs/
frontend/
  src/
sessions/
src/
Dockerfile
README.md
```

## Run Locally

### Backend

On Windows, if your default `python` points to MSYS or another environment without DuckDB wheels, prefer native CPython through `py -3.11`.

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\python -m pip install -r backend\requirements.txt
$env:PYTHONPATH='backend'
.\.venv\Scripts\python backend\scripts\build_database.py
.\.venv\Scripts\python -m uvicorn app.main:app --app-dir backend --reload
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` to `http://localhost:8000`.

### Single-service deployment

The repo also supports a single-service deployment path. The Docker image builds the React frontend, bundles the dataset, and serves the built SPA directly from FastAPI.

```powershell
docker build -t dodge-ai-o2c-graph-copilot .
docker run --rm -p 8000:8000 dodge-ai-o2c-graph-copilot
```

If you want LLM fallback in production, pass the same environment variables documented in `.env.example`.

## Example Questions

- Which products are associated with the highest number of billing documents?
- Trace the full flow of billing document `90504298`.
- Identify sales orders that have broken or incomplete flows.
- Which billing documents are cancelled and what are their cancellation documents?
- Show me open accounting documents that have not been cleared by a payment.

## Verification

Verified locally:

- dataset ingestion into DuckDB
- graph node and edge generation
- graph search and node inspection APIs
- deterministic trace and ranking queries
- frontend production build via `npm run build`
- backend smoke tests via `pytest`

## Notes For Evaluation

- The strongest modeling choice here is the unified semantic layer shared by the SQL engine and graph UI.
- The system explicitly handles one of the hardest parts of this dataset: cancellations and item-number normalization.
- Gemini is enabled in the deployed demo, but deterministic paths still cover the highest-signal evaluator workflows.
