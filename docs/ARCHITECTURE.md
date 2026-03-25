# Architecture Notes

This document explains how I structured the project and why the core pieces are shaped the way they are.

For a repository map, see `docs/PROJECT_STRUCTURE.md`.
For local workflow and extension guidance, see `docs/DEVELOPMENT.md`.

## Goal

The assignment asks for a graph-based interface over an ERP dataset with natural-language querying. I treated that as two related problems:
- model the order-to-cash dataset in a way that supports tracing and exception analysis
- make the chat and graph experiences read from the same business model

That second point was the most important one. If the graph and SQL engine drift apart, the demo becomes hard to trust.

## Backend structure

### `backend/app/services/ingestion.py`

This file is responsible for:
- loading the raw JSONL exports
- flattening nested records into relational rows
- creating raw DuckDB tables
- building the semantic SQL views
- materializing `graph_nodes` and `graph_edges`

This is the most important backend file because it defines the app's business vocabulary.

### `backend/app/services/query_service.py`

This is the main query orchestrator.

It decides:
- whether the question is in-domain
- whether a deterministic template should be used
- whether Gemini should be called
- whether generated SQL is safe to run
- how the final answer should be phrased
- which graph nodes should be focused after the answer

It also adds the small product touches that make the demo more usable:
- guided follow-up questions
- concise answer titles and highlights
- recommended next-action blocks
- export-friendly investigation output

### `backend/app/services/graph_service.py`

This service is intentionally separate from query orchestration.

It owns:
- initial graph selection
- graph search
- node detail lookup
- neighborhood expansion
- focus-node inference from result sets

The frontend only needs graph payloads; it does not need to know how graph slices are computed.

### `backend/app/services/inbox_service.py`

This service generates the operations inbox shown on the landing view.

I kept it separate from the chat logic because it solves a different product problem:
- what should an operator look at first
- which issue buckets are worth surfacing immediately
- which entities should be pre-focused before a question is even asked

### `backend/app/llm/providers.py`

This wraps provider-specific API calls so the query service can stay provider-agnostic.

Right now the deployed path uses Gemini, but the app can also support an OpenAI-compatible endpoint.

### `backend/app/services/project_help_service.py`

This powers the right-rail project guide.

I kept it separate from the ERP query path because it answers a different class of questions:
- how the project is built
- why key design choices were made
- how the stack, deployment, and verification fit together
- who built the project and what the submission contains

## Semantic model

### Why `o2c_flow` exists

I introduced `o2c_flow` because most of the product questions are not about raw tables. They are about business lineage:
- what order did this invoice come from?
- was it delivered?
- was it cancelled?
- was it posted to A/R?
- was it cleared?

That logic is painful to rebuild in every query. `o2c_flow` solves that once.

## Key joins and quirks

### Item normalization

Some item ids appear as `10`, others as `000010`. I normalize those before joining.

### Delivery-to-billing lineage

Billing items reference delivery items, not sales orders directly. That means the real chain is:

`sales order item -> delivery item -> billing item`

### Cancellations

Cancellation handling is explicit:
- `billing_document_type = 'S1'`
- `cancelled_billing_document` points back to the original billing document

### Accounting and payment clearance

Payment information is represented through clearing relationships tied to A/R documents, not as a simple invoice-payment foreign key.

## Graph model

The graph is materialized into two tables:
- `graph_nodes`
- `graph_edges`

Each node contains:
- a stable `node_id`
- a `node_type`
- display labels
- searchable text
- metadata JSON for the inspector

Each edge contains:
- source and target ids
- relationship type
- display label
- optional metadata

I chose to materialize the graph instead of generating it on every request because:
- the graph structure is derived from the same semantic layer every time
- graph search becomes straightforward
- the UI can stay simple

## Query design

### Deterministic paths

The deterministic layer exists for reliability, not because the app avoids LLMs.

For the main evaluator prompts, deterministic SQL is simply the better tool:
- easier to verify
- easier to explain
- less prompt-sensitive
- less likely to fail during a demo

### Gemini fallback

Gemini is used for broader in-domain questions that do not map neatly to templates.

To keep that path trustworthy:
- the schema guide is explicit
- SQL is validated before execution
- write operations are rejected
- non-approved tables are rejected
- one automatic repair pass is allowed if the model makes a schema mistake

## Frontend structure

### `frontend/src/App.tsx`

This is the page-level coordinator. It:
- bootstraps metadata and the initial graph
- keeps the chat, graph, and inspector in sync
- passes selected graph context into the query flow
- coordinates the separate project-guide chat in the right rail

### `frontend/src/components/ChatPanel.tsx`

This component focuses on:
- surfacing the operations inbox
- asking questions
- showing concise answers
- suggesting reasonable next questions
- letting a user export a lightweight investigation brief
- showing evidence and executed SQL only when expanded

The goal was to make the answer readable first and inspectable second.

### `frontend/src/components/GraphCanvas.tsx`

This component is intentionally lightweight. The backend decides what graph slice to show; the frontend just renders it and handles node selection.

### `frontend/src/components/InspectorPanel.tsx`

This now acts as a two-mode right rail:
- entity explorer for direct graph inspection
- a project-help chatbot for reviewer-facing questions about the build itself

## Deployment shape

I kept the deployment as one service:
- React frontend builds to static assets
- FastAPI serves both API routes and the built frontend
- DuckDB database is bootstrapped from the bundled dataset

That makes local setup and evaluator setup much simpler than running separate frontend, backend, and database services.

## Tradeoffs

Tradeoffs I chose deliberately:
- I favored a strong semantic layer over a larger number of UI features
- I kept the graph focused instead of showing everything at once
- I limited LLM usage to places where it adds flexibility without weakening trust

If this were extended further, I would likely add:
- saved investigations
- richer graph filtering
- role-aware runbooks for each inbox issue bucket
