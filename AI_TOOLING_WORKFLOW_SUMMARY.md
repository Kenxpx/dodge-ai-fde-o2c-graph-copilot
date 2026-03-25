# AI-Assisted Engineering Workflow Summary

This file is a curated summary of the AI-assisted workflow used to build the Dodge AI FDE submission. It is written as an uploadable substitute for raw editor transcripts or prompt exports.

The goal of the workflow was not to use AI to generate a flashy demo. The goal was to use AI as a force multiplier while retaining strong control over system design, data correctness, trust boundaries, product shape, and deployment quality.

## How I used AI

I used AI the way I would use it in a strong forward-deployed engineering loop:

- to compress time from ambiguity to structure
- to accelerate backend, frontend, data, and deployment execution in parallel
- to explore multiple implementation paths quickly and then choose deliberately
- to move faster on repetitive work without giving up architectural control
- to keep iterating until the result felt production-minded rather than assignment-shaped

In practice, AI was used as a high-leverage implementation partner, not as an autopilot. Every important part of the system was still driven by explicit technical choices, validation steps, and repeated refinement.

## Why this workflow fits the Forward Deployed Engineer role

The Dodge AI role emphasizes:

- end-to-end ownership
- working close to real operational workflows
- building reliable integrations and tooling
- turning ambiguous customer environments into repeatable product primitives
- debugging quickly across data, backend, frontend, and deployment layers
- using code-generation tools aggressively without becoming dependent on them

This project was intentionally built in that style.

I treated the take-home less like a toy app and more like a small forward-deployed product build:

- first understand the operational problem deeply
- model the messy ERP reality correctly
- ship something credible end to end
- tighten reliability and trust
- improve the user workflow until it feels useful in a real operator setting
- document it so another engineer or reviewer can understand the system quickly

## Primary tools used

- Codex / GPT-5 coding agent as the main implementation copilot
- PowerShell for local execution, profiling, verification, Git, and deployment operations
- FastAPI `TestClient`, `pytest`, and frontend production builds for validation

## End-to-end workflow

### 1. Decode the assignment and infer the real evaluation criteria

Representative prompt patterns:

- Analyze the Dodge AI role brief and task brief in depth.
- Infer what the company is actually testing beyond the explicit checklist.
- Recommend the smallest architecture that still looks credible as a real internal tool.

What AI helped accelerate:

- quickly extracting the hidden signals in the role and task language
- separating cosmetic requirements from the parts that actually demonstrate judgment
- focusing the build around ownership, grounding, usability, and shipping quality

What remained judgment-driven:

- deciding that this needed to feel like an operator tool, not a graph demo
- prioritizing reliability and reviewer trust over broad but shallow feature coverage

### 2. Reverse-engineer the ERP dataset before writing product code

Representative prompt patterns:

- Profile the SAP order-to-cash dataset and recover the true business lineage.
- Identify schema traps, broken joins, item-number inconsistencies, and cancellation semantics.
- Propose a semantic model that can support both graph exploration and grounded question answering.

What AI helped accelerate:

- fast schema inspection
- join-path exploration
- relationship hypothesis generation
- iterative data-model drafting

What remained judgment-driven:

- verifying that billing lineage was not a naive direct sales-order join
- normalizing item identifiers across documents
- treating cancellations as a first-class business behavior instead of an edge case

This was one of the highest-signal parts of the entire project. The real challenge was not rendering a graph. It was building a correct business model underneath it.

### 3. Design a shared semantic layer instead of separate graph and chat logic

Representative prompt patterns:

- Build one business model that powers both the graph and the answer layer.
- Avoid split-brain logic where the graph tells one story and the SQL answers tell another.
- Keep the system extensible enough for open-ended in-domain questions without sacrificing groundedness.

What AI helped accelerate:

- scaffolding the ingestion and graph materialization structure
- drafting and refining semantic transformations
- stress-testing architecture options quickly

What remained judgment-driven:

- choosing `DuckDB` as the core analytical store
- choosing `o2c_flow` as the semantic center of gravity
- deciding to keep graph generation, focused subgraphs, and SQL answers aligned through one shared model

### 4. Build a hybrid query engine with deterministic coverage first

Representative prompt patterns:

- Implement deterministic query templates for the evaluator-critical business questions.
- Add a constrained LLM path for broader in-domain ERP prompts.
- Validate generated SQL as read-only and grounded in known schema objects.

What AI helped accelerate:

- implementation of query orchestration and prompt shaping
- SQL-generation workflow scaffolding
- edge-case enumeration and repair-path iteration

What remained judgment-driven:

- deciding that deterministic coverage was essential for evaluator reliability
- constraining Gemini instead of allowing free-form generation
- structuring answers around evidence, findings, next actions, and graph focus

The final query system was intentionally hybrid:

- deterministic SQL for the highest-value investigation flows
- constrained Gemini-backed fallback for broader ERP questions
- explicit guardrails for off-domain prompts
- SQL safety validation to keep execution read-only and bounded

### 5. Treat the graph as a real investigation surface

Representative prompt patterns:

- Make the graph useful for analysis, not just visually impressive.
- Keep the graph focused on the entities behind the answer.
- Improve readability through layout selection, hover behavior, and interaction cues.

What AI helped accelerate:

- Cytoscape integration
- iterative UI experiments
- hover-state logic
- visual refinement passes

What remained judgment-driven:

- reducing graph noise rather than adding decorative complexity
- choosing focused subgraphs over giant unreadable canvases
- refining hover previews, neighborhood highlighting, and selection behavior so the graph helps the investigation workflow

### 6. Build the surrounding operator workflow, not just the core query path

Representative prompt patterns:

- Add the kinds of surfaces an operator would actually use around the analysis engine.
- Make the UI self-explanatory for someone seeing the product for the first time.
- Add reviewer-friendly affordances without turning the app into a cluttered dashboard.

What AI helped accelerate:

- feature scaffolding
- interface variants
- repetitive UI wiring
- export and utility flows

What remained judgment-driven:

- adding an operations inbox for cancellations, missing deliveries, and open A/R
- adding guided follow-up questions after grounded answers
- adding a right-rail project guide so reviewers can understand the implementation quickly
- tightening the overall UI repeatedly to move away from a generic AI-generated feel

### 7. Finish the project like a real deployment, not a local prototype

Representative prompt patterns:

- Prepare the repository for public review.
- Add setup instructions, architecture notes, API documentation, and submission artifacts.
- Deploy the app live and verify the hosted version, not just local code.

What AI helped accelerate:

- deployment packaging
- docs drafting
- repository polish
- submission artifact preparation

What remained judgment-driven:

- selecting the deployment target
- checking live behavior after push
- making sure the final product read like a serious engineering submission

## Representative prompt / workflow themes

These are the core prompt themes I used repeatedly across the build:

- analyze the role and task deeply before writing code
- infer the hidden evaluation rubric
- model the ERP relationships correctly before building UX
- design a hybrid deterministic plus LLM query engine
- keep the graph and answer layer grounded in one shared semantic model
- reject off-domain behavior and validate all generated SQL
- make the UI feel like an operator tool rather than an AI demo
- verify the live product, not just local code
- improve docs and submission materials until a reviewer can understand the system quickly

## Concrete technical decisions AI helped accelerate

### Shared semantic layer

The graph explorer and grounded Q&A both sit on top of the same business model. That keeps the product internally coherent and dramatically reduces trust problems.

### Deterministic-first evaluator coverage

I intentionally added deterministic support for the flows most likely to be evaluated:

- billing / invoice trace
- top customers
- top billed products
- incomplete flows
- cancellations
- open accounts receivable

This was a deliberate product and reliability decision, not just an implementation shortcut.

### Constrained Gemini fallback

The Gemini path exists to expand coverage, but it is intentionally constrained:

- domain guardrails
- schema-aware prompting
- read-only SQL validation
- repair handling when the model guesses a wrong field

That kept the app useful without letting the model become the source of truth.

### Graph as a workflow primitive

The graph layer was used as an investigation aid:

- focused subgraphs
- entity search
- hover previews
- neighborhood highlighting
- node inspection
- export support

That made the graph useful for tracing and triage instead of just decorative.

## Debugging and iteration highlights

- recovered and analyzed the actual role / task content before locking the architecture
- validated non-obvious ERP lineage paths instead of trusting superficial joins
- normalized inconsistent identifiers across item-level records
- modeled invoice cancellation behavior explicitly
- added SQL validation to reject unsafe or unsupported model output
- improved answer structure so results read like business analysis, not raw model text
- refined the graph workspace until the interaction quality matched the rest of the product
- fixed deployment packaging and verified the live application after push
- iterated on the UI multiple times to make it calmer, more professional, and more reviewer-friendly

## Validation and quality gates

AI-generated output was never treated as final by default. I used explicit quality gates:

- backend tests through `pytest`
- frontend production build through `npm run build`
- API smoke checks
- live deployment verification
- manual checks against the actual business flow and entity relationships

## What AI accelerated vs. what remained human-led

AI accelerated:

- scaffolding and code generation
- iterative refactors
- UI variants
- repetitive wiring
- documentation drafting
- edge-case brainstorming
- implementation speed across backend, frontend, and deployment

The human-led parts remained:

- architecture selection
- semantic model correctness
- evaluator prioritization
- guardrail design
- trust and usability tradeoffs
- deciding what to build deeply and what to leave out

## Closing note

The final workflow was not "use AI to generate a submission." It was "use AI to compress iteration cycles while preserving strong engineering control." That is exactly the mode I would bring to a forward-deployed environment: move quickly, own the full stack, reduce ambiguity into structure, and keep shipping until the system is operationally credible.
