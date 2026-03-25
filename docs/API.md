# API Guide

This project already runs on top of a FastAPI backend, so it can be used as both:
- a web application
- a programmatic API for grounded ERP and project-level workflows

## Base URLs

- Live API base: `https://dodge-ai-o2c-graph-copilot.onrender.com/api`
- Interactive docs: `https://dodge-ai-o2c-graph-copilot.onrender.com/api/docs`
- OpenAPI schema: `https://dodge-ai-o2c-graph-copilot.onrender.com/api/openapi.json`

## Core endpoints

### `GET /api`

Returns an API index with the main routes and docs links.

### `GET /api/health`

Simple health check.

### `GET /api/meta`

Returns:
- dataset statistics
- LLM readiness
- example ERP questions
- the operations inbox

### `POST /api/query/chat`

Main ERP analysis endpoint.

Use it for:
- invoice tracing
- cancellation analysis
- top customers or products
- incomplete flow investigations
- open A/R investigations
- broader in-domain Gemini-backed questions

Example:

```bash
curl -X POST "https://dodge-ai-o2c-graph-copilot.onrender.com/api/query/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Trace the full flow of billing document 90504298.",
    "conversation": [],
    "focus_node_ids": []
  }'
```

### `POST /api/help/chat`

Project guide endpoint.

Use it for:
- architecture questions
- setup and deployment questions
- authorship or submission-context questions
- stack and guardrail questions

Example:

```bash
curl -X POST "https://dodge-ai-o2c-graph-copilot.onrender.com/api/help/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "How does Gemini stay grounded in this project?",
    "conversation": []
  }'
```

### `GET /api/graph/initial`

Returns the starter graph view.

### `GET /api/graph/search?q=90504298`

Searches entities by id, label, or description.

### `GET /api/graph/node/{node_id}`

Returns node metadata and relationship summary.

### `POST /api/graph/expand`

Expand around one node.

Example:

```bash
curl -X POST "https://dodge-ai-o2c-graph-copilot.onrender.com/api/graph/expand" \
  -H "Content-Type: application/json" \
  -d '{
    "node_id": "billing_document:90504298",
    "depth": 1,
    "limit": 120
  }'
```

### `POST /api/graph/subgraph`

Build a subgraph around one or more node ids.

## Typical usage patterns

### 1. Programmatic ERP question answering

1. Call `GET /api/meta` to inspect readiness and example questions.
2. Call `POST /api/query/chat`.
3. Use:
   - `answer`
   - `highlights`
   - `recommended_actions`
   - `follow_up_questions`
   - `graph`
   - `evidence`

### 2. Entity-first graph workflows

1. Search with `GET /api/graph/search`.
2. Inspect a result with `GET /api/graph/node/{node_id}`.
3. Expand or fetch a focused subgraph.

### 3. Reviewer or onboarding workflows

1. Call `POST /api/help/chat`.
2. Use the answer to explain architecture, deployment, or project design choices.

## Notes

- The ERP query path is grounded in validated DuckDB SQL.
- Deterministic templates are used for the highest-signal evaluator workflows.
- Gemini is used only for broader in-domain questions that need dynamic SQL planning.
- OpenAPI docs are available directly through FastAPI at `/api/docs`.
