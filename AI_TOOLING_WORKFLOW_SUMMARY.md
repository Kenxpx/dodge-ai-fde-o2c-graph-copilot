# AI-Assisted Engineering Workflow Summary

This document is a curated summary of the AI-assisted workflow used to build the Dodge AI FDE submission. It is intended as an uploadable substitute when a raw editor transcript is not being shared.

## Primary tools used

- Codex / GPT-5 coding agent as the main implementation copilot
- PowerShell for execution, validation, deployment, and debugging
- FastAPI `TestClient`, `pytest`, and frontend production builds for verification

## How AI was used in practice

I used AI as a high-leverage implementation partner, not as an autopilot. The workflow was:

1. Understand the assignment precisely.
   - Extract the actual role and task expectations.
   - Separate the visible deliverables from the hidden evaluation criteria.
   - Optimize for reviewer trust, groundedness, and operational usefulness instead of surface complexity.

2. Reverse-engineer the dataset before writing product code.
   - Profile the SAP order-to-cash tables.
   - recover the true lineage across sales orders, delivery documents, billing documents, accounting entries, and payments
   - normalize item-level identifiers across systems where formatting was inconsistent
   - identify cancellation semantics and the exact reversal pattern in billing documents

3. Design the core semantic layer first.
   - Build a durable business view that both the graph and natural-language layer could share
   - avoid separate logic paths for the graph and chat so answers and graph focus stay aligned
   - choose a data model that supports deterministic evaluator workflows while still allowing broader in-domain queries

4. Implement the application end to end.
   - backend ingestion and semantic modeling
   - graph materialization and entity APIs
   - deterministic query templates for the highest-signal business questions
   - constrained LLM-backed SQL fallback for broader ERP prompts
   - reviewer-friendly React UI with graph exploration, operations inbox, guided follow-ups, and project guide

5. Iterate hard on trust and presentation.
   - improve answer structure so output reads like an operator tool instead of a raw LLM reply
   - add explicit evidence, SQL, focus entities, and recommended next actions
   - refine the graph workspace so it supports real inspection rather than just showing a dense network
   - improve deployment packaging, docs, API discoverability, and submission quality

## Representative prompt patterns

These are representative prompt styles and workflows I used while building and refining the submission:

### 1. Problem framing and evaluator alignment

- Analyze the role brief and the task brief deeply. Infer what the company is actually testing beyond the explicit checklist.
- Identify which parts of the assignment need production-style reliability versus where a lighter implementation is acceptable.
- Recommend the smallest architecture that still looks credible as an internal operator tool.

### 2. Data modeling and ERP lineage

- Profile the SAP order-to-cash dataset and derive the real join path from sales order to delivery to billing to accounting to payment.
- Detect schema traps, especially item-number formatting mismatches, indirect references, and cancellation semantics.
- Propose a semantic layer that can support both graph traversal and grounded SQL answers without duplicate logic.

### 3. Query engine and guardrails

- Build a hybrid query engine: deterministic templates for evaluator-critical questions and an LLM fallback for broader in-domain prompts.
- Constrain generated SQL to approved schema objects, validate it as read-only, and reject off-domain or unsafe prompts.
- Structure answers with key findings, follow-up questions, evidence, and recommended actions.

### 4. UI and workflow refinement

- Make the product feel like a real operator workspace rather than a generic AI dashboard.
- Improve graph readability, focus behavior, hover interactions, and entity inspection flows.
- Reduce visual noise, tighten the layout, and make the interface self-explanatory for a reviewer seeing it for the first time.

### 5. Deployment and submission quality

- Prepare the project for public review: docs, setup, deployment, API docs, AI workflow summary, and submission-ready artifacts.
- Test the live deployment and make sure the app works as a complete submission, not just as local code.

## Key technical decisions that came out of the AI workflow

### Shared semantic layer

The graph explorer and grounded Q&A both sit on top of the same semantic business model. That was deliberate. It keeps the app internally consistent and prevents the classic failure mode where the graph says one thing and the answer layer says another.

### Deterministic-first evaluator coverage

I intentionally implemented deterministic query templates for the most likely evaluator flows:

- invoice / billing trace
- top customers
- top billed products
- incomplete flows
- cancellations
- open accounts receivable

This made the demo much more reliable than relying entirely on model-generated SQL.

### Constrained LLM fallback instead of open-ended generation

The Gemini path is used as a constrained fallback for broader in-domain questions. It is not allowed to behave like a free-form chatbot. The prompts, schema constraints, read-only SQL validation, and repair logic were all added to keep it grounded.

### Graph as an investigation surface, not decoration

The graph was treated as an operator tool:

- focus-aware subgraphs
- entity inspection
- search-driven navigation
- hover previews
- neighborhood highlighting
- export support

That made it useful for tracing and triage instead of just acting as a visual gimmick.

## Debugging and iteration highlights

- Recovered the real Notion content and task expectations before designing the app
- Verified that billing lineage is not a trivial direct sales-order join
- Normalized item identifiers across documents so the business trace remains correct
- Modeled cancellation flows explicitly so reversed invoices do not produce misleading answers
- Added SQL validation to prevent unsafe or unsupported generated queries
- Tightened the frontend until the graph interactions, answer structure, and reviewer guide all worked together coherently
- Fixed deployment packaging issues and validated the live service after push
- Iterated on the UI multiple times to move away from a generic AI-generated look toward a cleaner, more professional product feel

## Validation and quality gates

I did not treat AI output as final by default. I used explicit quality gates:

- backend tests through `pytest`
- frontend production build through `npm run build`
- API smoke checks
- live deployment verification
- manual checks against the actual business flow and entity relationships

## What AI accelerated vs. what remained judgment-driven

AI accelerated:

- code scaffolding
- iterative refactors
- UI variants
- repetitive wiring
- documentation drafting
- edge-case brainstorming

Human judgment remained central for:

- architecture selection
- data model correctness
- evaluator prioritization
- trust/guardrail design
- deciding what to ship and what not to overbuild

## Closing note

The final workflow was not “use AI to generate a demo.” It was closer to “use AI to compress engineering iteration time while preserving strong control over the data model, trust boundaries, and product shape.” That is the same working style I would use in a forward-deployed engineering environment: fast iteration, grounded outputs, and constant movement toward something operationally credible.
