# Codex Session Summary

## Tools used

- Codex / GPT-5 coding agent
- Shell / PowerShell for execution, profiling, and validation
- Browser fetches for the public Notion pages and dataset

## How AI was used

1. Pulled and decoded the public role page and task brief.
2. Downloaded and profiled the SAP order-to-cash dataset.
3. Reverse-engineered join paths and failure modes in the data:
   - sales-order item normalization
   - delivery-to-billing lineage
   - cancellation-document handling
   - accounting-document and clearing-document linkage
4. Chose an architecture optimized for this exact assignment:
   - FastAPI
   - DuckDB
   - semantic SQL views
   - graph tables
   - React + Cytoscape
5. Implemented the backend, frontend, guardrails, and deterministic query layer.
6. Iterated through build and runtime bugs until the app built cleanly and the APIs passed smoke tests.

## Representative prompt / workflow patterns

- Analyze the public role page and task page in depth.
- Profile the dataset and identify the true entity relationships.
- Design a state-of-the-art but submission-friendly solution with strong grounding.
- Build a full backend and frontend implementation, not just a prototype.
- Add guardrails for off-domain prompts and validate all SQL as read-only.
- Verify the implementation end to end and prepare submission artifacts.

## Debugging and iteration highlights

- Switched from raw HTML fetches to Notion page-chunk endpoints to recover actual page contents.
- Validated that billing items reference delivery items rather than sales orders directly.
- Found and handled the cancellation pattern:
  - original billing documents marked as cancelled
  - `S1` cancellation documents pointing back through `cancelled_billing_document`
- Detected an environment-specific DuckDB install issue with MSYS Python and moved to native CPython 3.11 for wheel compatibility.
- Fixed an ingestion indentation bug introduced during patching.
- Fixed schema drift from flattened field names.
- Fixed SQL validation so CTE names were not incorrectly rejected.
- Tightened frontend typing and Cytoscape integration until the production build passed.

## Verification performed

- backend smoke tests via `pytest`
- database build from the provided dataset
- API smoke checks through FastAPI `TestClient`
- frontend production build via `npm run build`

## Notes

- The deterministic query layer was added intentionally so the demo remains strong even without an LLM key.
- The LLM path is available through environment configuration but the system does not depend on it to demonstrate the required evaluator flows.
